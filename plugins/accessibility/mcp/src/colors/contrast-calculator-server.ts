#!/usr/bin/env node

/**
 * MCP Server for WCAG Contrast Ratio Calculator
 *
 * Exposes contrast calculation tools for accessibility analysis
 * as an MCP (Model Context Protocol) server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  calculateWcagContrast,
  batchCalculateContrast,
} from "./contrast-calculator.js";

const server = new McpServer({
  name: "contrast-calculator",
  version: "1.1.0",
});

const colorSchema = z.string().describe(
  "CSS color in any supported format: hex (#rgb, #rrggbb, #rgba, #rrggbbaa), " +
  "rgb() / rgba(), hsl() / hsla(). " +
  "Examples: '#4a86e8', 'rgb(74, 134, 232)', 'rgba(0,0,0,0.87)', 'hsl(218, 76%, 60%)'"
);

server.registerTool(
  "calculate_contrast",
  {
    description:
      "Calculate WCAG 2.1 contrast ratio between foreground and background colors. " +
      "Returns detailed analysis including whether the combination passes WCAG requirements " +
      "for normal text (≥4.5:1), large text (≥3:1), and disabled text (≥3:1). " +
      "Accepts hex, rgb(), rgba(), hsl(), hsla() formats. " +
      "Semi-transparent colors are alpha-composited automatically. " +
      "Use this tool instead of manual calculations to ensure accuracy.",
    inputSchema: {
      foreground: colorSchema,
      background: colorSchema,
    },
  },
  ({ foreground, background }) => {
    const result = calculateWcagContrast(foreground, background);

    if ("error" in result) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: result.error }, null, 2),
          },
        ],
        isError: true,
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
);

server.registerTool(
  "batch_calculate_contrast",
  {
    description:
      "Calculate WCAG contrast ratios for multiple color combinations at once. " +
      "Useful for analyzing multiple UI elements in a single call. " +
      "Returns an array of results with contrast ratios and WCAG compliance for each combination.",
    inputSchema: {
      combinations: z.array(
        z.object({
          foreground: colorSchema,
          background: colorSchema,
          description: z.string().optional().describe(
            "Optional label for this color pair (e.g., 'Primary button text')"
          ),
        })
      ).describe("Array of color combinations to analyze"),
    },
  },
  ({ combinations }) => {
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
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Contrast Calculator MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
