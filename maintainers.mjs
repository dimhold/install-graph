/**
 * install-graph, second pass: who these people are.
 *
 *   node maintainers.mjs --out out
 *
 * CRITERIA rule 5: maintainers come from the registry by package name, not from
 * the installed manifest, which is not required to carry the field. A package
 * no longer in the registry is recorded as `gone` and is NOT counted in the
 * denominator of any share.
 *
 * Network, zero model calls. Append-only NDJSON: the file is its own resume
 * state, so an interrupted pass continues where it stopped.
 */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = flag("--out", "out");
const RPS = Number(flag("--rps", "15"));
const NDJSON = join(OUT, "maintainers.ndjson");

const names = readFileSync(join(OUT, "all-names.txt"), "utf8").split("\n").filter(Boolean);
const done = new Set();
if (existsSync(NDJSON)) {
  for (const line of readFileSync(NDJSON, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).name); } catch { /* truncated tail line */ }
  }
}
const todo = names.filter((n) => !done.has(n));
console.log(`names total ${names.length}, already taken ${done.size}, remaining ${todo.length}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gap = 1000 / RPS;
let ok = 0, gone = 0, failed = 0;

for (let i = 0; i < todo.length; i++) {
  const name = todo[i];
  const t0 = Date.now();
  let row;
  try {
    // Full packument. The abbreviated form (vnd.npm.install-v1+json) is far
    // cheaper but carries neither maintainers nor time — measured on the first
    // pass of 2026-08-26, when 1,598 of 1,598 rows came back as
    // `maintainers: 0`. We pay in bandwidth instead.
    const res = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2F")}`, {
      headers: { "user-agent": "install-graph (dimhold research)" },
    });
    if (res.status === 404) { row = { name, gone: true }; gone++; }
    else if (!res.ok) { row = { name, error: `HTTP ${res.status}` }; failed++; }
    else {
      const j = await res.json();
      const versions = Object.keys(j.versions ?? {});
      const latest = j["dist-tags"]?.latest ?? null;
      const times = j.time ?? {};
      // not every packument carries maintainers at the root; fall back to the latest version
      const m = j.maintainers ?? j.versions?.[latest]?.maintainers ?? [];
      row = {
        name,
        maintainers: Array.isArray(m) ? m.length : null,
        who: Array.isArray(m) ? m.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean) : [],
        versions: versions.length,
        latest,
        lastPublish: times.modified ?? null,
        created: times.created ?? null,
      };
      ok++;
    }
  } catch (e) {
    row = { name, error: String(e?.message ?? e).slice(0, 160) };
    failed++;
  }
  appendFileSync(NDJSON, JSON.stringify(row) + "\n");
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${todo.length}: ok ${ok}, gone ${gone}, failed ${failed}`);
  const spent = Date.now() - t0;
  if (spent < gap) await sleep(gap - spent);
}
console.log(`done: ok ${ok}, gone ${gone}, failed ${failed} -> ${NDJSON}`);
