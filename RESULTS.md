# Results — 2026-08-26

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

## Duplicate versions

165 of 1,197 distinct names in `frontend-a` are installed at more than one
version at once. That is why `installed` (1,729) and `distinct names` (1,197)
differ: 532 of the packages on that disk are second and third copies.

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
