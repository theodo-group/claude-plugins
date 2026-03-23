#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { z } from "zod";

const server = new McpServer({
    name: "mcp-accessibility-tree",
    version: "1.0.0",
});

const runCommand = (command) => {
    return execSync(command, { encoding: "utf-8" }).trim();
};

const errorResponse = (message) => ({
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
});

const convertWdaNode = (node) => {
    const out = {
        type: node.type || "Unknown",
        label: node.label || "",
        value: node.value || "",
        traits: node.traits || "",
    };
    if (Array.isArray(node.children) && node.children.length > 0)
        out.children = node.children.map(convertWdaNode);
    return out;
};

// ─── Android ────────────────────────────────────────────────────────────────
server.tool(
    "get_accessibility_tree_android",
    "Get the accessibility tree from a connected Android device or emulator via ADB and uiautomator. Returns the UI hierarchy as XML.",
    {
        deviceId: z
            .string()
            .optional()
            .describe("ADB device ID (e.g. emulator-5554). If omitted, uses the first connected device."),
    },
    async ({ deviceId }) => {
        try {
            runCommand("adb version");
        } catch {
            return errorResponse("adb not found. Install Android SDK platform-tools and make sure adb is in your PATH.");
        }

        let resolvedDeviceId = deviceId;
        if (!resolvedDeviceId) {
            try {
                const devicesOutput = runCommand("adb devices");
                for (const line of devicesOutput.split("\n")) {
                    if (line.endsWith("\tdevice")) {
                        resolvedDeviceId = line.split("\t")[0];
                        break;
                    }
                }
            } catch (e) {
                return errorResponse(`Failed to list ADB devices: ${e.message}`);
            }
            if (!resolvedDeviceId) {
                return errorResponse("No connected Android device or emulator found. Make sure ADB is running and a device is connected.");
            }
        }

        const adbPrefix = `-s ${resolvedDeviceId}`;
        try {
            runCommand(`adb ${adbPrefix} shell uiautomator dump /sdcard/uidump.xml`);
        } catch (e) {
            return errorResponse(`uiautomator dump failed on device ${resolvedDeviceId}: ${e.message}`);
        }
        try {
            runCommand(`adb ${adbPrefix} pull /sdcard/uidump.xml /tmp/uidump.xml`);
        } catch (e) {
            return errorResponse(`Failed to pull dump file from device: ${e.message}`);
        }

        let xml;
        try {
            xml = readFileSync("/tmp/uidump.xml", "utf-8").trim();
        } catch (e) {
            return errorResponse(`Failed to read dump file: ${e.message}`);
        }

        return { content: [{ type: "text", text: xml }] };
    }
);

// ─── iOS ─────────────────────────────────────────────────────────────────────
server.tool(
    "get_accessibility_tree_ios",
    "Get the accessibility tree from a booted iOS simulator using WebDriverAgent. WebDriverAgent must already be running and listening on port 8100. Returns a simplified tree (type, label, value, traits) to reduce token usage.",
    {
        appId: z
            .string()
            .optional()
            .describe("Bundle identifier of the app to bring to foreground before fetching the tree (e.g. com.example.MyApp). If omitted the current foreground app is used."),
        wdaPort: z
            .number()
            .optional()
            .default(8100)
            .describe("Port WebDriverAgent is listening on. Defaults to 8100."),
    },
    async ({ appId, wdaPort }) => {
        if (process.platform !== "darwin") {
            return errorResponse("iOS simulator support requires macOS.");
        }

        let deviceId;
        try {
            const simList = runCommand("xcrun simctl list devices booted");
            const match = simList.match(/([A-F0-9-]{36})/i);
            if (!match) {
                return errorResponse("No booted iOS simulator found. Boot a simulator first with `xcrun simctl boot <deviceId>` or from Xcode.");
            }
            deviceId = match[1];
        } catch (e) {
            return errorResponse(`Failed to list simulators: ${e.message}`);
        }

        if (appId) {
            try {
                runCommand(`xcrun simctl launch ${deviceId} ${appId}`);
            } catch (e) {
                return errorResponse(`Failed to launch app ${appId} on simulator ${deviceId}: ${e.message}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        let raw;
        try {
            raw = runCommand(`curl -sf -X GET -H "Accept: application/json" -H "Content-Type: application/json" "http://127.0.0.1:${wdaPort}/source?format=json"`);
        } catch {
            return errorResponse(`Could not reach WebDriverAgent on port ${wdaPort}. Make sure it is running: xcrun simctl launch ${deviceId} com.facebook.WebDriverAgentRunner.xctrunner`);
        }

        let tree;
        try {
            tree = convertWdaNode(JSON.parse(raw).value);
        } catch (e) {
            return errorResponse(`Failed to parse WebDriverAgent response: ${e.message}`);
        }

        return { content: [{ type: "text", text: JSON.stringify(tree, null, 2) }] };
    }
);

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
