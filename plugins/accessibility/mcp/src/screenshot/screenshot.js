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

// Returns the major iOS version for a connected real device, or null if unavailable.
const getRealDeviceIosMajorVersion = (udid) => {
    try {
        const udidFlag = udid ? `--udid ${udid}` : "";
        const info = runCommand(`ideviceinfo ${udidFlag} -k ProductVersion`);
        const major = parseInt(info.trim().split(".")[0], 10);
        return isNaN(major) ? null : major;
    } catch {
        return null;
    }
};

// Returns the UDID of the first connected real device, or null if none.
const getFirstRealDeviceUdid = () => {
    try {
        const output = runCommand("idevice_id -l");
        const udid = output.trim().split("\n")[0].trim();
        return udid || null;
    } catch {
        return null;
    }
};

// Simulator UDIDs use the standard UUID format (8-4-4-4-12 hex).
const isSimulatorUdid = (udid) =>
    /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(udid);

server.tool(
    "take_screenshot_ios",
    "Take a screenshot of the current screen on a booted iOS simulator or a connected real iOS device (iOS 16 and below only). Returns the screenshot as a base64-encoded PNG image.",
    {
        deviceId: z
            .string()
            .optional()
            .describe("Simulator UDID or real device UDID. If omitted, uses the first booted simulator, or the first connected real device (iOS ≤16) if no simulator is booted."),
    },
    async ({ deviceId }) => {
        if (process.platform !== "darwin") {
            return errorResponse("iOS support requires macOS.");
        }

        const tmpPath = "/tmp/ios_screenshot.png";

        // Determine whether the target is a simulator or real device
        const targetIsSimulator = !deviceId || isSimulatorUdid(deviceId);

        if (targetIsSimulator) {
            // Try simulator path
            let resolvedDeviceId = deviceId;
            if (!resolvedDeviceId) {
                try {
                    const simList = runCommand("xcrun simctl list devices booted");
                    const match = simList.match(/([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/i);
                    if (match) {
                        resolvedDeviceId = match[1];
                    }
                } catch {
                    // fall through to real device
                }
            }

            if (resolvedDeviceId) {
                try {
                    runCommand(`xcrun simctl io ${resolvedDeviceId} screenshot ${tmpPath}`);
                    const imageData = readFileSync(tmpPath).toString("base64");
                    return { content: [{ type: "image", data: imageData, mimeType: "image/png" }] };
                } catch (e) {
                    return errorResponse(`Failed to take screenshot on simulator ${resolvedDeviceId}: ${e.message}`);
                }
            }

            // No booted simulator — fall through to real device if no explicit deviceId was given
            if (deviceId) {
                return errorResponse(`No booted simulator found with UDID ${deviceId}.`);
            }
        }

        // Real device path
        const realDeviceUdid = deviceId && !isSimulatorUdid(deviceId) ? deviceId : getFirstRealDeviceUdid();
        if (!realDeviceUdid) {
            return errorResponse("No booted iOS simulator and no connected real device found.");
        }

        const majorVersion = getRealDeviceIosMajorVersion(realDeviceUdid);
        if (majorVersion !== null && majorVersion >= 17) {
            return errorResponse(
                `Real device screenshot is only supported on iOS 16 and below. ` +
                `This device is running iOS ${majorVersion}. ` +
                `Use a simulator instead, or mirror your device screen and take a screenshot manually.`
            );
        }

        try {
            runCommand(`idevicescreenshot --udid ${realDeviceUdid} ${tmpPath}`);
        } catch (e) {
            return errorResponse(
                `Failed to take screenshot from real device ${realDeviceUdid}: ${e.message}. ` +
                `Make sure libimobiledevice is installed (brew install libimobiledevice).`
            );
        }

        let imageData;
        try {
            imageData = readFileSync(tmpPath).toString("base64");
        } catch (e) {
            return errorResponse(`Failed to read screenshot file: ${e.message}`);
        }

        return { content: [{ type: "image", data: imageData, mimeType: "image/png" }] };
    }
);

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
