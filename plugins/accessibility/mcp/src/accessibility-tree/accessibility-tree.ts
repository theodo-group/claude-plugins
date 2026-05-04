#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { z } from "zod";

interface WdaNode {
  type?: string;
  label?: string;
  value?: string;
  traits?: string;
  children?: WdaNode[];
}

interface ConvertedNode {
  type: string;
  label: string;
  value: string;
  traits: string;
  children?: ConvertedNode[];
}

const server = new McpServer({
  name: "mcp-accessibility-tree",
  version: "1.0.0",
});

const runCommand = (command: string): string => {
  return execSync(command, { encoding: "utf-8" }).trim();
};

const errorResponse = (message: string) => ({
  content: [{ type: "text" as const, text: `Error: ${message}` }],
  isError: true,
});

const convertWdaNode = (node: WdaNode): ConvertedNode => {
  const out: ConvertedNode = {
    type: node.type ?? "Unknown",
    label: node.label ?? "",
    value: node.value ?? "",
    traits: node.traits ?? "",
  };
  if (Array.isArray(node.children) && node.children.length > 0)
    out.children = node.children.map(convertWdaNode);
  return out;
};

// ─── Android ────────────────────────────────────────────────────────────────
server.registerTool(
  "get_accessibility_tree_android",
  {
    description:
      "Get the accessibility tree from a connected Android device or emulator via ADB and uiautomator. Returns the UI hierarchy as XML.",
    inputSchema: {
      deviceId: z
        .string()
        .optional()
        .describe(
          "ADB device ID (e.g. emulator-5554). If omitted, uses the first connected device.",
        ),
    },
  },
  async ({ deviceId }) => {
    try {
      runCommand("adb version");
    } catch {
      return errorResponse(
        "adb not found. Install Android SDK platform-tools and make sure adb is in your PATH.",
      );
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
        return errorResponse(
          `Failed to list ADB devices: ${(e as Error).message}`,
        );
      }
      if (!resolvedDeviceId) {
        return errorResponse(
          "No connected Android device or emulator found. Make sure ADB is running and a device is connected.",
        );
      }
    }

    const adbDeviceIdOption = `-s ${resolvedDeviceId}`;
    try {
      // Get the accessibility tree as XML and save to a temporary file on the device
      runCommand(
        `adb ${adbDeviceIdOption} shell uiautomator dump /sdcard/uidump.xml`,
      );
    } catch (e) {
      return errorResponse(
        `uiautomator dump failed on device ${resolvedDeviceId}: ${(e as Error).message}`,
      );
    }
    try {
      // Pull the XML file from the device to the local machine
      runCommand(
        `adb ${adbDeviceIdOption} pull /sdcard/uidump.xml /tmp/uidump.xml`,
      );
    } catch (e) {
      return errorResponse(
        `Failed to pull dump file from device: ${(e as Error).message}`,
      );
    }

    let xml: string;
    try {
      xml = readFileSync("/tmp/uidump.xml", "utf-8").trim();
    } catch (e) {
      return errorResponse(
        `Failed to read dump file: ${(e as Error).message}`,
      );
    }

    return { content: [{ type: "text" as const, text: xml }] };
  },
);

// ─── iOS ─────────────────────────────────────────────────────────────────────
server.registerTool(
  "get_accessibility_tree_ios",
  {
    description:
      "Get the accessibility tree from a booted iOS simulator or connected physical device using WebDriverAgent. WebDriverAgent must already be running and reachable on the given port. Returns a simplified tree (type, label, value, traits) to reduce token usage.",
    inputSchema: {
      appId: z
        .string()
        .optional()
        .describe(
          "Bundle identifier of the app to bring to foreground before fetching the tree (e.g. com.example.MyApp). If omitted the current foreground app is used.",
        ),
      wdaPort: z
        .number()
        .optional()
        .default(8100)
        .describe(
          "Port WebDriverAgent is listening on. Defaults to 8100. Use a different port (e.g. 8101) when targeting a physical device while a simulator is also occupying 8100.",
        ),
      deviceId: z
        .string()
        .optional()
        .describe(
          "UDID of the target simulator or physical device. If omitted, auto-detects: prefers a booted simulator, falls back to a connected physical device.",
        ),
    },
  },
  async ({ appId, wdaPort, deviceId }) => {
    if (process.platform !== "darwin") {
      return errorResponse("iOS simulator support requires macOS.");
    }

    let resolvedDeviceId = deviceId;
    let isPhysicalDevice = false;

    if (resolvedDeviceId) {
      try {
        const simList = runCommand("xcrun simctl list devices booted");
        isPhysicalDevice = !simList.includes(resolvedDeviceId);
      } catch {
        isPhysicalDevice = true;
      }
    } else {
      try {
        const simList = runCommand("xcrun simctl list devices booted");
        const match = simList.match(/([A-F0-9-]{36})/i);
        if (match) resolvedDeviceId = match[1];
      } catch {}

      if (!resolvedDeviceId) {
        try {
          const deviceList = runCommand(
            "xcrun devicectl list devices --hide-headers",
          );
          for (const line of deviceList.split("\n")) {
            if (!line.includes("connected")) continue;
            const match = line.match(/([A-F0-9-]{36})/i);
            if (match) {
              resolvedDeviceId = match[1];
              isPhysicalDevice = true;
              break;
            }
          }
        } catch {}
      }
    }

    if (!resolvedDeviceId) {
      return errorResponse(
        "No booted iOS simulator or connected physical device found.",
      );
    }

    if (appId) {
      try {
        if (isPhysicalDevice) {
          runCommand(
            `xcrun devicectl device process launch --device ${resolvedDeviceId} ${appId}`,
          );
        } else {
          runCommand(`xcrun simctl launch ${resolvedDeviceId} ${appId}`);
        }
      } catch (e) {
        return errorResponse(
          `Failed to launch app ${appId} on device ${resolvedDeviceId}: ${(e as Error).message}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let raw: string;
    try {
      raw = runCommand(
        `curl -sf -X GET -H "Accept: application/json" -H "Content-Type: application/json" "http://127.0.0.1:${wdaPort}/source?format=json"`,
      );
    } catch {
      const launchCmd = isPhysicalDevice
        ? `xcrun devicectl device process launch --device ${resolvedDeviceId} com.facebook.WebDriverAgentRunner.xctrunner`
        : `xcrun simctl launch ${resolvedDeviceId} com.facebook.WebDriverAgentRunner.xctrunner`;
      return errorResponse(
        `Could not reach WebDriverAgent on port ${wdaPort}. Make sure it is running: ${launchCmd}`,
      );
    }

    let tree: ConvertedNode;
    try {
      tree = convertWdaNode((JSON.parse(raw) as { value: WdaNode }).value);
    } catch (e) {
      return errorResponse(
        `Failed to parse WebDriverAgent response: ${(e as Error).message}`,
      );
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(tree, null, 2) }],
    };
  },
);

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Accessibility Tree MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
