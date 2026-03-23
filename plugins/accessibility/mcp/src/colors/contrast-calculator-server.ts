#!/usr/bin/env node

/**
 * MCP Server for WCAG Contrast Ratio Calculator
 *
 * Exposes contrast calculation tools for accessibility analysis
 * as an MCP (Model Context Protocol) server.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  calculateWcagContrast,
  batchCalculateContrast,
  findAccessibleAlternative
} from "./contrast-calculator.js";

// Create server instance
const server = new Server(
  {
    name: "contrast-calculator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "calculate_contrast",
        description:
          "Calculate WCAG 2.1 contrast ratio between foreground and background colors. " +
          "Returns detailed analysis including whether the combination passes WCAG requirements " +
          "for normal text (≥4.5:1), large text (≥3:1), and disabled text (≥3:1). " +
          "Use this tool instead of manual calculations to ensure accuracy.",
        inputSchema: {
          type: "object",
          properties: {
            foreground: {
              type: "string",
              description: "Foreground color in hex format (e.g., '#4a86e8' or '4a86e8')",
            },
            background: {
              type: "string",
              description: "Background color in hex format (e.g., '#ffffff' or 'ffffff')",
            },
          },
          required: ["foreground", "background"],
        },
      },
      {
        name: "batch_calculate_contrast",
        description:
          "Calculate WCAG contrast ratios for multiple color combinations at once. " +
          "Useful for analyzing multiple UI elements in a single call. " +
          "Returns an array of results with contrast ratios and WCAG compliance for each combination.",
        inputSchema: {
          type: "object",
          properties: {
            combinations: {
              type: "array",
              description: "Array of color combinations to analyze",
              items: {
                type: "object",
                properties: {
                  foreground: {
                    type: "string",
                    description: "Foreground color in hex format",
                  },
                  background: {
                    type: "string",
                    description: "Background color in hex format",
                  },
                  description: {
                    type: "string",
                    description: "Optional description of this color combination (e.g., 'Button text')",
                  },
                },
                required: ["foreground", "background"],
              },
            },
          },
          required: ["combinations"],
        },
      },
      {
        name: "find_accessible_alternative",
        description:
          "Find an accessible color alternative that meets WCAG requirements. " +
          "Takes a target color and background, and returns a modified version of the target " +
          "that passes the specified WCAG threshold (normal text: 4.5:1 or large text: 3:1). " +
          "Note: The function adjusts brightness, which may result in significantly darker or lighter colors.",
        inputSchema: {
          type: "object",
          properties: {
            targetColor: {
              type: "string",
              description: "The color you want to make accessible (hex format)",
            },
            backgroundColor: {
              type: "string",
              description: "The background color it will be placed on (hex format)",
            },
            requirement: {
              type: "string",
              enum: ["normal", "large"],
              description: "WCAG requirement level: 'normal' for ≥4.5:1 or 'large' for ≥3:1",
              default: "normal",
            },
          },
          required: ["targetColor", "backgroundColor"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "calculate_contrast": {
        const { foreground, background } = args as {
          foreground: string;
          background: string;
        };

        const result = calculateWcagContrast(foreground, background);

        if ("error" in result) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: result.error }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  foreground,
                  background,
                  contrastRatio: `${result.contrastRatio}:1`,
                  passes: result.passes,
                  luminance: result.luminance,
                  recommendation: result.recommendation,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "batch_calculate_contrast": {
        const { combinations } = args as {
          combinations: Array<{
            foreground: string;
            background: string;
            description?: string;
          }>;
        };

        const results = batchCalculateContrast(combinations);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                results.map((result, index) => ({
                  description: result.description,
                  foreground: combinations[index].foreground,
                  background: combinations[index].background,
                  contrastRatio: `${result.contrastRatio}:1`,
                  passes: result.passes,
                  recommendation: result.recommendation,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "find_accessible_alternative": {
        const { targetColor, backgroundColor, requirement } = args as {
          targetColor: string;
          backgroundColor: string;
          requirement?: "normal" | "large";
        };

        const result = findAccessibleAlternative(
          targetColor,
          backgroundColor,
          requirement || "normal"
        );

        if ("error" in result) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: result.error }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  originalColor: targetColor,
                  backgroundColor,
                  requirement: requirement || "normal",
                  accessibleAlternative: result.color,
                  contrastRatio: `${result.contrastRatio}:1`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Contrast Calculator MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
