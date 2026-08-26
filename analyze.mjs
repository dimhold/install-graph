/**
 * install-graph, the join: projects x maintainers -> results.json and a table.
 *
 *   node analyze.mjs --out out
 *
 * Requests nothing. It works only off the files written by scan.mjs and
 * maintainers.mjs, so every number in RESULTS.md can be recomputed offline from
 * what is in this repository.
 *
 * CRITERIA rule 5: a package absent from the registry is not in the denominator.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = flag("--out", "out");
const SNAPSHOT = flag("--snapshot", "2026-08-26");

const projects = JSON.parse(readFileSync(join(OUT, "projects.json"), "utf8"));
const reg = new Map();
for (const line of readFileSync(join(OUT, "maintainers.ndjson"), "utf8").split("\n")) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  reg.set(r.name, r);
}
const now = Date.parse(SNAPSHOT);
const YEAR = 365 * 24 * 3600 * 1000;

for (const p of projects) {
  const pkgs = JSON.parse(readFileSync(join(OUT, `packages-${p.id}.json`), "utf8"));
  const names = [...new Set(pkgs.map((x) => x.name))];
  const known = names.map((n) => reg.get(n)).filter((r) => r && typeof r.maintainers === "number");
  const gone = names.filter((n) => reg.get(n)?.gone).length;
  const accounts = new Set();
  for (const r of known) for (const w of r.who ?? []) accounts.add(w);
  const byAccount = new Map();
  for (const r of known) for (const w of r.who ?? []) byAccount.set(w, (byAccount.get(w) ?? 0) + 1);
  const top = [...byAccount].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const stale1 = known.filter((r) => r.lastPublish && now - Date.parse(r.lastPublish) > YEAR).length;
  const stale2 = known.filter((r) => r.lastPublish && now - Date.parse(r.lastPublish) > 2 * YEAR).length;

  p.registry = {
    resolved: known.length, gone,
    oneMaintainer: known.filter((r) => r.maintainers === 1).length,
    oneMaintainerPct: +(100 * known.filter((r) => r.maintainers === 1).length / known.length).toFixed(1),
    accounts: accounts.size,
    packagesPerAccount: +(known.length / accounts.size).toFixed(2),
    topAccounts: top.map(([name, n]) => ({ name, packages: n, sharePct: +(100 * n / known.length).toFixed(1) })),
    silentOverAYear: stale1, silentOverAYearPct: +(100 * stale1 / known.length).toFixed(1),
    silentOverTwoYears: stale2, silentOverTwoYearsPct: +(100 * stale2 / known.length).toFixed(1),
  };
}

const out = { snapshot: SNAPSHOT, generatedAt: new Date().toISOString(), projects };
writeFileSync(join(OUT, "results.json"), JSON.stringify(out, null, 2));

const rows = projects.map((p) => [
  p.id, p.kind.split(",")[0], p.direct, p.installed, p.ratio, p.distinctNames,
  p.multiVersionNames, p.npmDepth ?? "—", p.mb, p.files,
  p.registry.accounts, p.registry.oneMaintainerPct + "%", p.registry.silentOverAYearPct + "%",
]);
const head = ["project", "kind", "direct", "installed", "per direct", "names", "multi-version", "depth", "MB", "files", "accounts", "1 maintainer", "silent >1y"];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
const line = (cells) => "| " + cells.map((c, i) => String(c).padEnd(w[i])).join(" | ") + " |";
console.log(line(head));
console.log("|" + w.map((n) => "-".repeat(n + 2)).join("|") + "|");
for (const r of rows) console.log(line(r));
console.log(`\nresults.json -> ${join(OUT, "results.json")}`);
