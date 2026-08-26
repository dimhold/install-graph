/**
 * install-graph — how much foreign code arrives per line in dependencies.
 *
 *   node scan.mjs --out out
 *
 * Counts what is on disk (a node_modules walk), not what the lock file
 * promises. Definitions are in CRITERIA.md, written before the first number.
 *
 * Zero model calls, zero network requests. The network is used only by the
 * second pass (maintainers.mjs) and the split is deliberate: a disk walk that
 * also talks to a registry cannot be rerun offline from the artifact.
 *
 * Point the env vars at your own projects. The three front ends in the
 * published run belong to a former client and are anonymised: only numbers are
 * published, never names or paths.
 */
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = flag("--out", "out");

const PROJECTS = [
  { id: "frontend-a", dir: process.env.FRONTEND_A ?? "", kind: "large front end, Angular + Selenium e2e" },
  { id: "frontend-b", dir: process.env.FRONTEND_B ?? "", kind: "large front end, Angular + Selenium e2e" },
  { id: "frontend-c", dir: process.env.FRONTEND_C ?? "", kind: "large front end, Angular + Selenium e2e" },
  { id: "social-media", dir: process.env.SOCIAL_MEDIA ?? "", kind: "small tool, TypeScript CLI" },
  { id: "fault-mcp", dir: process.env.FAULT_MCP ?? "", kind: "small library, MCP server" },
].filter((p) => p.dir);

/** Walks node_modules. Collects every package found, with its nesting depth. */
function walkNodeModules(nmDir, depth, acc) {
  let entries;
  try { entries = readdirSync(nmDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    const name = e.name;
    if (name.startsWith(".")) continue;               // .bin, .cache — rule 3
    if (name.startsWith("@")) {                       // scoped — rule 4
      const scopeDir = join(nmDir, name);
      let scoped;
      try { scoped = readdirSync(scopeDir, { withFileTypes: true }); } catch { continue; }
      for (const s of scoped) {
        if (!s.isDirectory() && !s.isSymbolicLink()) continue;
        if (s.name.startsWith(".")) continue;
        takePackage(join(scopeDir, s.name), `${name}/${s.name}`, depth, acc);
      }
      continue;
    }
    takePackage(join(nmDir, name), name, depth, acc);
  }
}

function takePackage(pkgDir, pkgName, depth, acc) {
  const manifest = join(pkgDir, "package.json");
  if (!existsSync(manifest)) return;
  let version = null;
  try { version = JSON.parse(readFileSync(manifest, "utf8")).version ?? null; } catch { /* a broken manifest is a fact too */ }
  acc.packages.push({ name: pkgName, version, nesting: depth });
  const nested = join(pkgDir, "node_modules");
  if (existsSync(nested)) walkNodeModules(nested, depth + 1, acc);
}

/** Tree size and file count. Symlinks are not followed. */
function measureTree(dir) {
  let bytes = 0, files = 0, dirs = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(cur, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { dirs++; stack.push(p); continue; }
      try { bytes += statSync(p).size; files++; } catch { /* vanished mid-walk */ }
    }
  }
  return { bytes, files, dirs };
}

/** Depth from the npm tree. Fails on inconsistent projects, which is the field, not an error. */
function npmDepth(dir) {
  try {
    const raw = execFileSync("npm", ["ls", "--all", "--json"], {
      cwd: dir, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, shell: true, stdio: ["ignore", "pipe", "ignore"],
    });
    return depthOf(JSON.parse(raw));
  } catch (err) {
    // npm ls still emits JSON on a non-zero exit when the tree is inconsistent
    const raw = err?.stdout?.toString?.() ?? "";
    if (raw.trim().startsWith("{")) {
      try { const tree = JSON.parse(raw); return { ...depthOf(tree), degraded: true }; } catch { /* not JSON after all */ }
    }
    return { depth: null, nodes: null, degraded: true, error: String(err?.message ?? err).slice(0, 200) };
  }
}

function depthOf(tree) {
  let max = 0, nodes = 0;
  const walk = (node, d) => {
    const deps = node?.dependencies;
    if (!deps) return;
    for (const k of Object.keys(deps)) {
      nodes++;
      if (d + 1 > max) max = d + 1;
      walk(deps[k], d + 1);
    }
  };
  walk(tree, 0);
  return { depth: max, nodes };
}

mkdirSync(OUT, { recursive: true });
const results = [];
const allNames = new Set();

for (const proj of PROJECTS) {
  const nm = join(proj.dir, "node_modules");
  if (!existsSync(nm)) { console.error(`skipping ${proj.id}: no node_modules`); continue; }
  const t0 = Date.now();
  const manifest = JSON.parse(readFileSync(join(proj.dir, "package.json"), "utf8"));
  const deps = Object.keys(manifest.dependencies ?? {});
  const devDeps = Object.keys(manifest.devDependencies ?? {});
  const acc = { packages: [] };
  walkNodeModules(nm, 1, acc);
  const size = measureTree(nm);
  const depth = npmDepth(proj.dir);
  const distinct = new Set(acc.packages.map((p) => p.name));
  for (const n of distinct) allNames.add(n);
  const dupes = {};
  for (const p of acc.packages) (dupes[p.name] ??= new Set()).add(p.version);
  const multiVersion = Object.entries(dupes).filter(([, v]) => v.size > 1).length;
  const direct = deps.length + devDeps.length;
  const row = {
    id: proj.id, kind: proj.kind,
    direct, deps: deps.length, devDeps: devDeps.length,
    installed: acc.packages.length,
    distinctNames: distinct.size,
    ratio: +(acc.packages.length / direct).toFixed(2),
    ratioDistinct: +(distinct.size / direct).toFixed(2),
    multiVersionNames: multiVersion,
    maxNesting: Math.max(...acc.packages.map((p) => p.nesting)),
    npmDepth: depth.depth, npmNodes: depth.nodes, npmDegraded: depth.degraded ?? false,
    bytes: size.bytes, mb: +(size.bytes / 1024 / 1024).toFixed(1),
    files: size.files, dirs: size.dirs,
    bytesPerDirect: Math.round(size.bytes / direct),
    tookMs: Date.now() - t0,
  };
  results.push(row);
  console.log(`${proj.id}: direct ${direct}, installed ${row.installed}, ratio ${row.ratio}, ${row.mb} MB, files ${row.files}, npm depth ${row.npmDepth}${row.npmDegraded ? " (inconsistent tree)" : ""}`);
  writeFileSync(join(OUT, `packages-${proj.id}.json`), JSON.stringify(acc.packages, null, 0));
}

writeFileSync(join(OUT, "projects.json"), JSON.stringify(results, null, 2));
writeFileSync(join(OUT, "all-names.txt"), [...allNames].sort().join("\n"));
console.log(`\ndistinct names across the whole sample: ${allNames.size} -> ${join(OUT, "all-names.txt")}`);
