const path = require("path");
const { scanDirectory } = require("./scan");
const { parseFile } = require("./parseFile");
const { extractImports } = require("./extractImports");
const { resolveModule } = require("./resolveModule");

/**
 * Scans `rootDir`, parses every source file, extracts its module
 * references and resolves them, producing a dependency graph:
 *
 *   {
 *     nodes: [{ id, label, ext, external, parseError }],
 *     edges: [{ from, to, kind, names }],
 *     stats: { fileCount, edgeCount, parseErrors, externalCount, cycles }
 *   }
 *
 * Node ids are paths relative to `rootDir` for internal modules, and the
 * raw package specifier (e.g. "react") for external ones.
 */
function buildGraph(rootDir, { includeExternal = true, extensions, ignoreDirs } = {}) {
  const absRoot = path.resolve(rootDir);
  const files = scanDirectory(absRoot, { extensions, ignoreDirs });

  const nodes = new Map();
  const edges = [];
  const parseErrors = [];

  const toId = (absPath) => path.relative(absRoot, absPath).split(path.sep).join("/");

  const addNode = (id, attrs) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, ...attrs });
    } else {
      Object.assign(nodes.get(id), attrs);
    }
  };

  for (const absFile of files) {
    const id = toId(absFile);
    const { ast, error, ext } = parseFile(absFile);

    if (error) {
      addNode(id, { label: id, ext, external: false, parseError: error });
      parseErrors.push({ file: id, error });
      continue;
    }

    addNode(id, { label: id, ext, external: false, parseError: null });

    const refs = extractImports(ast);
    for (const ref of refs) {
      const { resolved, external, source, candidate } = resolveModule(absFile, ref.source);

      let targetId;
      if (external) {
        if (!includeExternal) continue;
        targetId = source;
        addNode(targetId, { label: source, ext: null, external: true, parseError: null });
      } else if (resolved) {
        targetId = toId(resolved);
        if (!nodes.has(targetId)) {
          addNode(targetId, { label: targetId, ext: path.extname(resolved), external: false, parseError: null });
        }
      } else {
        // relative import that didn't resolve to a real file on disk;
        // key it by the computed absolute path so the same missing
        // target referenced from different files merges into one node
        targetId = toId(candidate) + " (missing)";
        addNode(targetId, { label: source, ext: null, external: false, parseError: null, unresolved: true });
      }

      edges.push({ from: id, to: targetId, kind: ref.kind, names: ref.names });
    }
  }

  const cycles = findCycles(nodes, edges);

  return {
    nodes: Array.from(nodes.values()),
    edges,
    stats: {
      fileCount: files.length,
      edgeCount: edges.length,
      parseErrorCount: parseErrors.length,
      parseErrors,
      externalCount: Array.from(nodes.values()).filter((n) => n.external).length,
      cycleCount: cycles.length,
      cycles,
    },
  };
}

/** Simple DFS-based cycle detection over the internal-module subgraph. */
function findCycles(nodes, edges) {
  const adjacency = new Map();
  for (const n of nodes.keys()) adjacency.set(n, []);
  for (const e of edges) {
    if (adjacency.has(e.from) && adjacency.has(e.to)) adjacency.get(e.from).push(e.to);
  }

  const cycles = [];
  const visited = new Set();
  const stack = [];
  const onStack = new Set();

  const dfs = (node) => {
    visited.add(node);
    stack.push(node);
    onStack.add(node);

    for (const next of adjacency.get(node) || []) {
      if (!visited.has(next)) {
        dfs(next);
      } else if (onStack.has(next)) {
        const start = stack.indexOf(next);
        cycles.push(stack.slice(start).concat(next));
      }
    }

    stack.pop();
    onStack.delete(node);
  };

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) dfs(node);
  }

  return cycles;
}

module.exports = { buildGraph };
