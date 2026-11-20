#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_NAME = "react-form-step-manager";
const TARGET_PRESETS = { agents: ".agents/skills", claude: ".claude/skills" };
const USAGE = `Usage: react-form-step-manager install-skill [--target claude|agents|<path>] [--force]

Copies the ${SKILL_NAME} AI skill into <target>/${SKILL_NAME}.
  --target  "agents" (default, ./.agents/skills), "claude" (./.claude/skills) or a directory path
  --force   overwrite an existing installation`;

function parseArguments(argumentList) {
  const options = { target: "agents", force: false, help: false };
  for (let index = 0; index < argumentList.length; index += 1) {
    const argument = argumentList[index];
    if (argument === "--force") options.force = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--target") {
      const value = argumentList[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--target requires a value");
      options.target = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "--help" || command === "-h" || command === undefined) {
    console.log(USAGE);
    return command === undefined ? 1 : 0;
  }
  if (command !== "install-skill") throw new Error(`Unknown command: ${command}\n${USAGE}`);

  const options = parseArguments(rest);
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  const sourceDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "ai", "skills", SKILL_NAME);
  const targetRoot = resolve(process.cwd(), TARGET_PRESETS[options.target] ?? options.target);
  const destination = join(targetRoot, SKILL_NAME);

  if (existsSync(destination) && !options.force) {
    throw new Error(`${destination} already exists. Use --force to overwrite.`);
  }
  mkdirSync(targetRoot, { recursive: true });
  cpSync(sourceDirectory, destination, { recursive: true, force: true });
  console.log(`Installed ${SKILL_NAME} skill to ${destination}`);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
