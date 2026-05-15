#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildEvidencePackets,
  buildDashboard,
  createWebhookEnvelope,
  renderMarkdown
} = require("./index");

function main(argv) {
  const args = parseArgs(argv);

  if (!args.input) {
    throw new Error("Missing --input <file>");
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const result = buildEvidencePackets(input);

  if (args.project) {
    result.packets = result.packets.filter((packet) => packet.projectId === args.project);
    result.dashboard = buildDashboard(result.packets);
  }

  if (args.webhookSecret) {
    result.webhookOutbox = result.packets.map((packet) =>
      createWebhookEnvelope(packet, { secret: args.webhookSecret })
    );
  }

  if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(renderMarkdown(result));
}

function parseArgs(argv) {
  const args = { format: "markdown" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      args.input = argv[++index];
    } else if (arg === "--format") {
      args.format = argv[++index];
    } else if (arg === "--project") {
      args.project = argv[++index];
    } else if (arg === "--webhook-secret") {
      args.webhookSecret = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["json", "markdown"].includes(args.format)) {
    throw new Error("--format must be json or markdown");
  }

  return args;
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { main, parseArgs };
