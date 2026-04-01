#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { z } from "zod";

const server = new McpServer({
    name: "mcp-screenshot",
    version: "1.0.0",
});

const runCommand = (command) => {
    return execSync(command, { encoding: "utf-8" }).trim();
};

const errorResponse = (message) => ({
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
});

// ─── Android ────────────────────────────────────────────────────────────────
server.tool(
    "take_screenshot_android",
    "Take a screenshot of the current screen on a connected Android device or emulator via ADB. Returns the screenshot as a base64-encoded PNG image.",
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
        const tmpPath = "/tmp/android_screenshot.png";
        try {
            const pngBytes = execSync(`adb ${adbPrefix} exec-out screencap -p`);
            writeFileSync(tmpPath, pngBytes);
        } catch (e) {
            return errorResponse(`Failed to take screenshot on device ${resolvedDeviceId}: ${e.message}`);
        }

        let imageData;
        try {
            imageData = readFileSync(tmpPath).toString("base64");
        } catch (e) {
            return errorResponse(`Failed to read screenshot file: ${e.message}`);
        }

        return {
            content: [{ type: "image", data: imageData, mimeType: "image/png" }],
        };
    }
);

// ─── iOS ─────────────────────────────────────────────────────────────────────
server.tool(
    "take_screenshot_ios",
    "Take a screenshot of the current screen on a booted iOS simulator. Returns the screenshot as a base64-encoded PNG image.",
    {
        deviceId: z
            .string()
            .optional()
            .describe("Simulator UDID. If omitted, uses the first booted simulator."),
    },
    async ({ deviceId }) => {
        if (process.platform !== "darwin") {
            return errorResponse("iOS simulator support requires macOS.");
        }

        let resolvedDeviceId = deviceId;
        if (!resolvedDeviceId) {
            try {
                const simList = runCommand("xcrun simctl list devices booted");
                const match = simList.match(/([A-F0-9-]{36})/i);
                if (!match) {
                    return errorResponse("No booted iOS simulator found. Boot a simulator first with `xcrun simctl boot <deviceId>` or from Xcode.");
                }
                resolvedDeviceId = match[1];
            } catch (e) {
                return errorResponse(`Failed to list simulators: ${e.message}`);
            }
        }

        const tmpPath = "/tmp/ios_screenshot.png";
        try {
            runCommand(`xcrun simctl io ${resolvedDeviceId} screenshot ${tmpPath}`);
        } catch (e) {
            return errorResponse(`Failed to take screenshot on simulator ${resolvedDeviceId}: ${e.message}`);
        }

        let imageData;
        try {
            imageData = readFileSync(tmpPath).toString("base64");
        } catch (e) {
            return errorResponse(`Failed to read screenshot file: ${e.message}`);
        }

        return {
            content: [{ type: "image", data: imageData, mimeType: "image/png" }],
        };
    }
);

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
