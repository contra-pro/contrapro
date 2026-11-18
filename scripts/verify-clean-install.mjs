// Clean lockfile installation in a NEW isolated directory. Never removes root node_modules.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const workspace = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--refresh-tooling-lock")) throw new Error("Unknown clean-install action");
const refresh = args[0] === "--refresh-tooling-lock";
const originalLock = readFileSync(join(workspace, "package-lock.json"));
const originalManifest = readFileSync(join(workspace, "package.json"));
const intendedParent = resolve(workspace, ".verification");
mkdirSync(intendedParent, { recursive: true });
const parent = realpathSync(intendedParent);
if (parent !== intendedParent) throw new Error("Refusing a redirected verification directory");
const task = realpathSync(mkdtempSync(join(parent, "install-")));
const nonce = randomUUID();
const marker = join(task, ".contratpro-install-check");
writeFileSync(marker, nonce, { flag: "wx" });
try {
  for (const file of ["package.json", "package-lock.json", "apps/web/package.json", "packages/infrastructure/database/package.json"]) {
    if (refresh && file === "package-lock.json") continue;
    const destination = join(task, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(workspace, file), destination);
  }
  // Do not copy credential-bearing npm configuration into the fixture.
  writeFileSync(join(task, ".npmrc"), "ignore-scripts=true\n");
  const npmCli = process.env.npm_execpath;
  if (!npmCli || basename(npmCli) !== "npm-cli.js" || !existsSync(npmCli)) throw new Error("Run this check through npm");
  const run = (command) => spawnSync(process.execPath, [npmCli, ...command, "--prefix", task, "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline", "--cache", join(workspace, ".npm-cache")], {
    cwd: task, encoding: "utf8", windowsHide: true, timeout: 180000,
  });
  if (refresh) {
    // Preserve the existing compatible lint utility while npm regenerates the
    // esbuild subgraph. This temporary resolver constraint is never copied back.
    const fixtureManifest = JSON.parse(originalManifest);
    if (JSON.parse(originalLock).packages["node_modules/@eslint-community/eslint-utils"]?.version !== "4.9.1") {
      throw new Error("Review the existing lint utility version before lock refresh");
    }
    fixtureManifest.overrides["@eslint-community/eslint-utils"] = "4.9.1";
    writeFileSync(join(task, "package.json"), JSON.stringify(fixtureManifest));
    const generated = run(["install", "--package-lock-only"]);
    if (generated.status !== 0) throw new Error("Isolated lock generation failed");
    const oldPackages = JSON.parse(originalLock).packages;
    const nextPackages = JSON.parse(readFileSync(join(task, "package-lock.json"), "utf8")).packages;
    const identities = (packages) => new Set(Object.entries(packages).filter(([, value]) => value.version)
      .map(([path, value]) => `${path.split("node_modules/").at(-1)}@${value.version}`));
    const known = identities(oldPackages);
    const unexpected = [...identities(nextPackages)].filter((identity) => !known.has(identity)
      && !identity.startsWith("esbuild@") && !identity.startsWith("@esbuild/"));
    if (unexpected.length) throw new Error(`Lock refresh refused unrelated version changes: ${unexpected.join(", ")}`);
    // Frozen verification must use the real manifest, not the temporary constraint.
    writeFileSync(join(task, "package.json"), originalManifest);
  }
  const result = run(["ci"]);
  if (result.status !== 0) {
    console.error("Isolated frozen install failed; no root dependencies were removed.");
    console.error(result.stderr || result.error?.message || "Unknown install failure");
    process.exitCode = 1;
  } else {
    const fixtureRequire = createRequire(join(task, "package.json"));
    const core = fixtureRequire.resolve("@esbuild-kit/core-utils");
    const compilerManifest = createRequire(core).resolve("esbuild/package.json");
    if (!realpathSync(compilerManifest).startsWith(join(task, "node_modules") + (process.platform === "win32" ? "\\" : "/"))) {
      throw new Error("Compiler resolution escaped the isolated install");
    }
    if (JSON.parse(readFileSync(compilerManifest, "utf8")).version !== "0.25.12") {
      throw new Error("Frozen install did not resolve the reviewed patched tooling compiler");
    }
    if (refresh) {
      if (!readFileSync(join(workspace, "package-lock.json")).equals(originalLock)
        || !readFileSync(join(workspace, "package.json")).equals(originalManifest)) throw new Error("Workspace changed during lock verification");
      copyFileSync(join(task, "package-lock.json"), join(workspace, "package-lock.json"));
      console.log("PASS npm-generated tooling lock refresh; unrelated dependency versions unchanged");
    }
    console.log("PASS isolated npm ci with lifecycle scripts disabled and patched tooling; root node_modules untouched");
  }
} finally {
  // Resolve/containment plus a marker created before installation establishes ownership.
  // Refuse cleanup if anything redirected or replaced our disposable task directory.
  const target = realpathSync(task);
  if (dirname(target) !== parent || !basename(target).startsWith("install-") || readFileSync(marker, "utf8") !== nonce) {
    throw new Error("Cleanup refused: verification target ownership/containment changed");
  }
  rmSync(target, { recursive: true, force: false, maxRetries: 2, retryDelay: 250 });
}
