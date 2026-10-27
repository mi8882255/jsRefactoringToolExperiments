#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { buildGraph } = require("./src/buildGraph");
const { renderStaticHtml } = require("./src/renderHtml");

function parseArgs(argv) {
  const args = {
    target: ".",
    out: "module-graph-report.html",
    serve: false,
    port: 4321,
    includeExternal: true,
    enableProjects: true,
    diff: undefined,
    json: null,
  };

  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--serve") args.serve = true;
    else if (a === "--port") args.port = Number(argv[++i]);
    else if (a === "--no-external") args.includeExternal = false;
    else if (a === "--no-projects") args.enableProjects = false;
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
  --out <file.html>     Write a standalone HTML report (default: module-graph-report.html)
  --json <file.json>    Also write the raw graph data as JSON
  --serve                Start a local server with a live "Rescan" button instead of writing a file
  --port <n>             Port for --serve (default: 4321)
  --no-external          Hide external (node_modules / bare specifier) dependencies
  --diff [spec]          Mark files changed per git diff + everything that imports them
                           --diff            uncommitted changes (staged + unstaged + new files)
                           --diff main       changes vs. "main", including uncommitted
                           --diff "main HEAD" changes strictly between two refs
  --no-projects          Don't auto-detect sibling package.json projects / cross-project links
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

  if (args.serve) {
    const { startServer } = require("./src/server");
    startServer({ targetDir, port: args.port, includeExternal: args.includeExternal, enableProjects: args.enableProjects, diff: args.diff });
    return;
  }

  console.log(`Scanning ${targetDir} ...`);
  const graph = buildGraph(targetDir, { includeExternal: args.includeExternal, enableProjects: args.enableProjects, diff: args.diff });
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

  const html = renderStaticHtml(graph, { title: path.basename(targetDir) });
  fs.writeFileSync(args.out, html);
  console.log(`Wrote report to ${path.resolve(args.out)}`);
}

main();
