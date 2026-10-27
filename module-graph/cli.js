#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { buildGraph } = require("./src/buildGraph");
const { renderStaticHtml } = require("./src/renderHtml");

/**
 * Default report filename when --out isn't given: derived from the
 * scanned path (slashes/dots/etc replaced so it's a clean single
 * segment) plus a short random suffix, so running the tool again on
 * the same or a different folder never silently overwrites the last
 * report.
 */
function defaultOutName(targetDir) {
  const base = path.basename(path.resolve(targetDir));
  const sanitized = (base || "project").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `module-graph-${sanitized}-${suffix}.html`;
}

function parseArgs(argv) {
  const args = {
    target: ".",
    out: null,
    serve: false,
    port: 4321,
    includeExternal: true,
    enableProjects: true,
    diff: undefined,
    json: null,
    csv: null,
    csvNodes: null,
    extraBuiltins: [],
    skipBuiltinFilter: false,
  };

  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--csv") args.csv = argv[++i];
    else if (a === "--csv-nodes") args.csvNodes = argv[++i];
    else if (a === "--serve") args.serve = true;
    else if (a === "--port") args.port = Number(argv[++i]);
    else if (a === "--no-external") args.includeExternal = false;
    else if (a === "--no-projects") args.enableProjects = false;
    else if (a === "--extra-builtins") args.extraBuiltins = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--show-builtins") args.skipBuiltinFilter = true;
    else if (a === "--diff") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args.diff = next;
        i++;
      } else {
        args.diff = "";
      }
    } else if (a === "--json") args.json = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else rest.push(a);
  }
  if (rest[0]) args.target = rest[0];
  return args;
}

function printHelp() {
  console.log(`
Usage: node module-graph/cli.js [target-dir] [options]

  target-dir           Directory to scan (default: current directory)
  --out <file.html>     Write a standalone HTML report (default: module-graph-<dir>-<random>.html)
  --json <file.json>    Also write the raw graph data as JSON
  --csv <file.csv>       Also write the dependency tree as a flat edge table (from,to,kind,...)
  --csv-nodes <file.csv> Also write one row per file/package with its metadata (depth, roles, diff flags, ...)
  --serve                Start a local server with a live "Rescan" button instead of writing a file
  --port <n>             Port for --serve (default: 4321)
  --no-external          Hide external (node_modules / bare specifier) dependencies
  --diff [spec]          Mark files changed per git diff + everything that imports them
                           --diff            uncommitted changes (staged + unstaged + new files)
                           --diff main       changes vs. "main", including uncommitted
                           --diff "main HEAD" changes strictly between two refs
  --no-projects          Don't auto-detect sibling package.json projects / cross-project links
  --extra-builtins <a,b> Also exclude these module names as "standard library", on top of Node's own
  --show-builtins        Don't exclude builtins at all; show them as regular external nodes
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const targetDir = path.resolve(args.target);
  if (!fs.existsSync(targetDir)) {
    console.error(`Target directory not found: ${targetDir}`);
    process.exitCode = 1;
    return;
  }

  const graphOpts = {
    includeExternal: args.includeExternal,
    enableProjects: args.enableProjects,
    diff: args.diff,
    extraBuiltins: args.extraBuiltins,
    skipBuiltinFilter: args.skipBuiltinFilter,
  };

  if (args.serve) {
    const { startServer } = require("./src/server");
    startServer({ targetDir, port: args.port, ...graphOpts });
    return;
  }

  console.log(`Scanning ${targetDir} ...`);
  const graph = buildGraph(targetDir, graphOpts);
  console.log(
    `Found ${graph.stats.fileCount} files, ${graph.stats.edgeCount} edges, ` +
      `${graph.stats.externalCount} external deps, ${graph.stats.cycleCount} cycles` +
      (graph.stats.parseErrorCount ? `, ${graph.stats.parseErrorCount} parse errors` : "") +
      (graph.stats.projects.length > 1 ? `, ${graph.stats.projects.length} sub-projects` : "")
  );
  if (graph.stats.diff) {
    const d = graph.stats.diff;
    if (d.error) console.log(`  diff warning: ${d.error}`);
    else console.log(`  diff (${d.spec}): ${d.changedCount} files changed, ${d.impactedCount} modules impacted downstream`);
  }

  if (args.json) {
    fs.writeFileSync(args.json, JSON.stringify(graph, null, 2));
    console.log(`Wrote graph JSON to ${args.json}`);
  }

  if (args.csv) {
    const { edgesToCsv } = require("./src/exportCsv");
    fs.writeFileSync(args.csv, edgesToCsv(graph));
    console.log(`Wrote dependency table (edges) to ${args.csv}`);
  }

  if (args.csvNodes) {
    const { nodesToCsv } = require("./src/exportCsv");
    fs.writeFileSync(args.csvNodes, nodesToCsv(graph));
    console.log(`Wrote file/node table to ${args.csvNodes}`);
  }

  const outFile = args.out || defaultOutName(targetDir);
  const html = renderStaticHtml(graph, { title: path.basename(targetDir) });
  fs.writeFileSync(outFile, html);
  console.log(`Wrote report to ${path.resolve(outFile)}`);
}

main();
