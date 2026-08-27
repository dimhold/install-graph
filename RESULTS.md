# Results — 2026-08-27

Snapshot date 2026-08-26. Registry data pulled the same day. Raw numbers in
`out/results.json`; per-project package lists in `out/packages-*.json`.

| project | kind | direct | installed | per direct | distinct names | names with several versions | npm depth | MB | files | publishing accounts | one maintainer | silent > 1 year |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| frontend-a | Angular front end, Selenium e2e | 70 | 1729 | **24.7** | 1197 | 165 | 12 | 363.3 | 50 649 | 613 | 50.2% | 56.6% |
| frontend-b | Angular front end, Selenium e2e | 51 | 1542 | **30.2** | 1055 | 137 | 11 | 733.7 | 67 595 | 590 | 47.6% | 64.5% |
| frontend-c | Angular front end, Selenium e2e | 62 | 1709 | **27.6** | 1181 | 154 | 13 | 352.4 | 63 581 | 579 | 48.8% | 57.8% |
| fault-mcp | MCP server library | 6 | 141 | **23.5** | 139 | 1 | 9 | 76.5 | 4 545 | 125 | 48.2% | 38.1% |
| social-media | TypeScript CLI | 3 | 6 | **2.0** | 6 | 0 | 3 | 36.7 | 320 | 12 | 66.7% | 0% |

Across all five projects: 1,598 distinct package names, **852 distinct
publishing accounts**, 50.0% of names with exactly one maintainer, 58.2% with no
publish in over a year, 44.7% with none in over two.

## Concentration

Counted over the union of all five projects, 1,598 names:

| account | packages | share |
|---|---|---|
| ljharb | 141 | 8.8% |
| nicolo-ribaudo | 132 | 8.3% |
| hzoo | 128 | 8.0% |
| existentialism | 128 | 8.0% |
| jlhwung | 127 | 7.9% |
| sindresorhus | 118 | 7.4% |
| jonschlinkert | 101 | 6.3% |

Four of the top five are Babel maintainers, so those columns overlap heavily by
construction — a monorepo publishes many names under the same set of accounts.
`ljharb` and `sindresorhus` do not have that explanation.

## Duplicates, counted in bytes

This is the part a resolved dependency graph cannot see, and it is measured by
walking the directory. Bytes are attributed per package **excluding its nested
`node_modules`**, so nothing is counted twice, and duplicate bytes are charged
to every copy after the largest one — the conservative reading of "extra".

| project | installed | distinct names | duplicate copies | duplicate MB | share of node_modules | duplicate files | same name and version |
|---|---|---|---|---|---|---|---|
| frontend-a | 1 729 | 1 197 | 532 | 52.2 | **14.4%** | 7 904 | 313 |
| frontend-b | 1 542 | 1 055 | 487 | 102.5 | 14.0% | 33 835 | 312 |
| frontend-c | 1 709 | 1 181 | 528 | 60.6 | **17.2%** | 24 304 | 332 |
| fault-mcp | 141 | 139 | 2 | 0.0 | 0% | 11 | 1 |
| social-media | 6 | 6 | 0 | 0.0 | 0% | 0 | 0 |

Two things stand out.

**A seventh of the directory is a copy.** 14.0% to 17.2% of everything in
`node_modules` on the three front ends is a second or third copy of a name
already installed.

**Most of that is not version resolution.** 313 of frontend-a's 532 duplicate
copies are **the same name at the same version** — 59%. Across the three front
ends the same-version share of duplicates runs 59% to 64%. Those are not two
incompatible versions that a resolver had to keep apart; they are identical
packages written to disk twice.

The small projects show the contrast without ambiguity: a 141-package MCP server
library carries 2 duplicate copies and 0.0 MB, and a 6-package CLI carries none.

## The ratio does not track project size

| project | direct | ratio |
|---|---|---|
| frontend-b | 51 | 30.2 |
| frontend-c | 62 | 27.6 |
| frontend-a | 70 | 24.7 |
| fault-mcp | 6 | 23.5 |
| social-media | 3 | 2.0 |

A 6-dependency library sits in the same band as three large front ends. The
outlier is the 3-dependency CLI, whose dependencies happen to be
`typescript`, `tsx` and `@types/node`. **What you pick decides the ratio; how
big the project is does not.** Five projects cannot establish more than that.

## Notes on the run

`npm ls --all --json` exited non-zero on `frontend-b` with an inconsistent
tree and still emitted usable JSON on stdout; depth 11 for that project is read
from that output and flagged `npmDegraded` in `results.json`.

The registry pass was run twice. The first run used the abbreviated packument
and returned `maintainers: 0` for all 1,598 names, because that format carries
neither `maintainers` nor `time`. Numbers above come from the second run, over
full packuments.
