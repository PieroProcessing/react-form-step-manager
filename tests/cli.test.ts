import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const cliPath = resolve(__dirname, "..", "bin", "install-skill.mjs");
let workingDirectory: string;

const runCli = (...cliArguments: string[]) =>
  spawnSync(process.execPath, [cliPath, ...cliArguments], { cwd: workingDirectory, encoding: "utf8" });

beforeEach(() => {
  workingDirectory = mkdtempSync(join(tmpdir(), "rfsm-cli-"));
});
afterEach(() => rmSync(workingDirectory, { recursive: true, force: true }));

describe("install-skill CLI", () => {
  it("copies the skill into ./.agents/skills by default", () => {
    const result = runCli("install-skill");
    expect(result.status).toBe(0);
    expect(existsSync(join(workingDirectory, ".agents", "skills", "react-form-step-manager", "SKILL.md"))).toBe(true);
    expect(
      existsSync(join(workingDirectory, ".agents", "skills", "react-form-step-manager", "references", "api.md")),
    ).toBe(true);
  });

  it("supports the claude preset and custom paths", () => {
    expect(runCli("install-skill", "--target", "claude").status).toBe(0);
    expect(existsSync(join(workingDirectory, ".claude", "skills", "react-form-step-manager", "SKILL.md"))).toBe(true);
    expect(runCli("install-skill", "--target", "custom/dir").status).toBe(0);
    expect(existsSync(join(workingDirectory, "custom", "dir", "react-form-step-manager", "SKILL.md"))).toBe(true);
  });

  it("refuses to overwrite without --force", () => {
    runCli("install-skill");
    const skillFile = join(workingDirectory, ".agents", "skills", "react-form-step-manager", "SKILL.md");
    const refused = runCli("install-skill");
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("--force");
    expect(runCli("install-skill", "--force").status).toBe(0);
    expect(readFileSync(skillFile, "utf8")).toContain("react-form-step-manager");
  });

  it("fails on unknown commands", () => {
    expect(runCli("nope").status).toBe(1);
  });
});
