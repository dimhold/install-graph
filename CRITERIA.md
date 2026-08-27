# Criteria and definitions

**Written 2026-08-26, before a single number was counted**, and committed
separately so the order is visible in git history: definitions first, data
second. Otherwise "depth" gets defined to fit whichever number looks best.

Nothing in this file is rewritten after counting. Corrections are appended at
the end, with a date and a reason.

---

## Question

How much foreign code arrives on a machine per line in `dependencies`, and how
different a typical front end is from a small tool by that measure.

## Unit of observation

One **project**: one `package.json` with `node_modules` installed.

| metric | definition |
|---|---|
| `direct` | count of names in the root `dependencies` + `devDependencies` |
| `installed` | installed packages: unique `node_modules/**/package.json` paths, nested `node_modules` included |
| `distinctNames` | distinct package names among the installed, duplicate versions collapsed |
| `ratio` | `installed / direct` — packages arriving per direct dependency |
| `depth` | maximum depth in the `npm ls --all --json` tree, root = 0 |
| `bytes` | sum of file sizes under `node_modules`; on-disk allocation is not counted |
| `files` | file count under `node_modules` |
| `oneMaintainer` | share of installed names with exactly one maintainer in the registry |
| `publishers` | distinct accounts that published at least one installed package |

## Counting rules, fixed in advance

1. **What is on disk is counted, not what the lock file promises.** The source
   of truth is the `node_modules` walk. `npm ls --all --json` is used only for
   depth and the tree shape, and when it fails with `ERR` on an inconsistent
   tree the depth is recorded as degraded and the run continues. Old projects
   are inconsistent; that is the field, not an error.
2. **Duplicate versions are not collapsed in `installed`.** The same library
   installed three times at three versions is three copies of foreign code on
   disk, and the question is about code on disk. The collapsed number is
   reported separately as `distinctNames` so the difference stays visible.
3. **`.bin`, `.package-lock.json` and any dot-directory are not packages.**
4. **Scoped packages** (`node_modules/@scope/name`) count as one package; the
   `@scope` directory itself is not a package.
5. **Maintainers come from the registry by package name**, not from the
   installed `package.json`: an installed manifest is not required to carry a
   `maintainers` field. A package no longer in the registry is recorded as
   `gone` and is excluded from the denominator, not counted as zero.
6. **Zero model calls.** The measurement is entirely mechanical.

## Sample

Projects are **real, not assembled for the measurement**:

- `frontend-a`, `frontend-b`, `frontend-c` — working Angular projects with
  Selenium end-to-end tests (`webdriver-manager`, Protractor), dependencies
  fully installed. These belong to a former client and are published as numbers
  only; names and paths are not part of the artifact.
- A contrast is mandatory, otherwise the number has nothing to sit against:
  two small projects of the same owner, a TypeScript CLI and an MCP server
  library.

A project without an installed `node_modules` is **not** in the sample.
Counting from a lock file would be counting something else.

## What would disprove the expectation

Expectation: `ratio` for large front ends sits well above 10 — more than ten
foreign packages per direct dependency.

**If `ratio` came out around 3–5 and identical for large and small projects,
there is nothing to publish**: "graph depth" would then be a property of the
package manager rather than of the project, and there is no claim there. Written
before counting.

## What this does not do

Does not claim an installed package executes. `node_modules` carries tests, docs
and build artefacts of other people's packages. That is part of what arrives and
not an answer to what runs; separating live from dead code is a different
measurement.

Does not measure vulnerabilities. `npm audit` counts against its own database
with its own method — someone else's metric with someone else's methodology.

---

## Addendum 2026-08-26, after the run: the registry pass was run twice

The first registry pass requested abbreviated packuments
(`application/vnd.npm.install-v1+json`). That format carries **neither
`maintainers` nor `time`**, and it returned 1,598 of 1,598 rows reading
`maintainers: 0` — a number that would have been published as a finding had it
not been obviously impossible. The pass was rerun over full packuments. Rule 5
is unchanged; only the request format was wrong.

---

## Addendum 2026-08-27: who has already done this

**Written after the run, which is the wrong order**, and recorded as an addendum
for that reason. From 2026-08-27 this section is mandatory in every
measurement's criteria and is written *before* the first number, next to the
disproof condition.

The amplification framing is published (see Prior work in `README.md`). What is
not published, and what this measurement should have been framed around from the
start, is the on-disk side: duplicate versions physically installed, bytes,
files, and publishing accounts per real project. Registry-graph studies count
distinct names and cannot see any of it.
