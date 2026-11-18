# Dependency triage — P1.2B-1R

Observed on 2026-11-14 with Node.js 24.15.0 / npm 11.12.1. Registry audit evidence
was available in this slice; earlier P1.2A timeout reports remain historical facts.

## esbuild finding and bounded remediation

The chain was Drizzle Kit 0.31.11 -> @esbuild-kit/esm-loader 2.6.5 ->
@esbuild-kit/core-utils 3.3.2 -> esbuild 0.18.20. The upstream advisory affects
esbuild's serve mode, not every call to its transformation API:
[GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

The reviewed project scripts run Next.js, Vitest, offline checks and the guarded
operational CLI. They do not start esbuild's serve API. Core-utils exposes and uses
transform/transformSync for the inspected tooling path; Next uses Turbopack. This
is a scoped reachability assessment, not a claim about arbitrary manual commands
or every future Drizzle Studio/tool-server mode.

A root override limits the replacement to core-utils' esbuild dependency at
0.25.12, a patched version already present in Drizzle Kit's graph. Direct Next,
React, Drizzle, pg and lint/test package versions were preserved. No forced audit
fix, Drizzle major upgrade or global npm update was performed.

Tests exercise the actual core-utils synchronous transform and asynchronous
transformation of the repository's Drizzle configuration, without executing the
configuration or connecting to PostgreSQL. They also assert the resolved patched
compiler version. These tests validate the used transform paths, not every possible
tooling feature.

The existing lock initially retained the old compiler during ordinary npm install/
update/dedupe. A fresh npm-generated lock was prepared in a disposable directory,
guarded against unrelated package-version changes and verified with npm ci using
the real manifests before copying the generated lock back. A temporary resolver
constraint preserved the existing compatible eslint-utils 4.9.1; it was removed
before frozen verification and is not a root dependency override. Subsequent root
installation and compatibility tests used 0.25.12 successfully.

## Audit results

Commands used (these contact the npm registry, not any database):

```text
npm audit --json --cache .npm-cache --fetch-retries=0 --fetch-timeout=15000
npm audit --omit=dev --json --cache .npm-cache --fetch-retries=0 --fetch-timeout=15000
```

- Before the fix: 11 moderate findings, zero high/critical.
- After the fix: 7 moderate findings, zero high/critical; the esbuild advisory and
  its propagated chain are absent from the audit result.
- Production-only audit: zero reported vulnerabilities.
- Full audit exits 1 because moderate development findings remain. Do not describe
  the entire graph as vulnerability-free or the full audit as passing.

The remaining findings propagate from minimatch in the TypeScript-ESLint chain:
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
The inspected typescript-estree call uses `{ dot: true }`, not the advisory's
optimizationLevel >= 2 option. Current lint/config patterns are trusted repository
inputs; no browser-controlled glob endpoint or production use was found in this
slice. This is not a complete exploitability proof.

Do not force minimatch across a major API boundary just to remove the audit count.
Follow up with a maintainer-compatible TypeScript-ESLint update and focused lint
validation before expanding untrusted pattern processing or exposing developer
tooling. Review date: before the next dependency update and before production
readiness. Development advisories do not authorize public tooling servers.

## Reproducibility and remaining diagnostic

`npm run verify:clean-install` passed with lifecycle scripts disabled and patched
compiler resolution checked inside a new directory under `.verification/`.
Containment and a task-specific ownership marker gate cleanup. Root node_modules
was not removed; no unrelated process was stopped.

`npm ls esbuild --all` (also with workspace-root inclusion) still returns
ELSPROBLEMS, describing the overridden compiler as outside core-utils' upstream
~0.18.20 declaration. This diagnostic remains unresolved; do not report a clean
npm dependency-tree diagnostic. Actual npm ci, the version guard, transform tests
and required application checks passed. Retain the override/lock together, recheck
them on future updates, and resolve this packaging diagnostic before production
toolchain finalization. No unsupported global npm changes were attempted.
