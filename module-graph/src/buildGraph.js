const path = require("path");
const { scanDirectory, DEFAULT_IGNORE_DIRS } = require("./scan");
const { parseFile } = require("./parseFile");
const { extractImports } = require("./extractImports");
const { resolveModule } = require("./resolveModule");
const { findProjects, projectForFile } = require("./projects");
const { getChangedFiles } = require("./gitDiff");

/**
 * Scans `rootDir`, parses every source file, extracts its module
 * references and resolves them, producing a dependency graph:
 *
 *   {
 *     nodes: [{ id, label, ext, external, project, changed, impacted, ... }],
 *     edges: [{ from, to, kind, names, crossProject }],
 *     stats: { fileCount, edgeCount, parseErrors, externalCount, cycles,
 *              builtinSkippedCount, projects, projectGraph, diff }
 *   }
 *
 * Node ids are paths relative to `rootDir` for internal modules, and the
 * raw package specifier (e.g. "react") for external ones.
 *
 * Options:
 *   includeExternal - include third-party (node_modules / bare) packages (default true)
 *   enableProjects   - detect sibling package.json projects and link them
 *                      through their package name instead of treating that
 *                      as a generic external dependency (default true)
 *   diff             - a git diff spec (see gitDiff.js) to mark changed files
 *                      and everything that transitively imports them; omit
 *                      to skip diff analysis entirely
 */
function buildGraph(rootDir, { includeExternal = true, extensions, ignoreDirs, enableProjects = true, diff } = {}) {
  const absRoot = path.resolve(rootDir);
  const effectiveIgnoreDirs = ignoreDirs || DEFAULT_IGNORE_DIRS;
  const files = scanDirectory(absRoot, { extensions, ignoreDirs: effectiveIgnoreDirs });
  const projects = enableProjects ? findProjects(absRoot, effectiveIgnoreDirs) : [];

  const nodes = new Map();
  const edges = [];
  const parseErrors = [];
  let builtinSkippedCount = 0;

  const toId = (absPath) => path.relative(absRoot, absPath).split(path.sep).join("/");
  const projectIdFor = (absPath) => {
    const p = projectForFile(absPath, projects);
    return p ? p.id : null;
  };

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
    const project = projectIdFor(absFile);

    if (error) {
      addNode(id, { label: id, ext, external: false, project, parseError: error });
      parseErrors.push({ file: id, error });
      continue;
    }

    addNode(id, { label: id, ext, external: false, project, parseError: null });

    const refs = extractImports(ast);
    for (const ref of refs) {
      const res = resolveModule(absFile, ref.source, { projects });

      if (res.kind === "builtin") {
        builtinSkippedCount++;
        continue;
      }

      let targetId;

      if (res.kind === "relative") {
        if (res.resolved) {
          targetId = toId(res.resolved);
          if (!nodes.has(targetId)) {
            addNode(targetId, { label: targetId, ext: path.extname(res.resolved), external: false, project: projectIdFor(res.resolved) });
          }
        } else {
          // relative import that didn't resolve to a real file on disk;
          // key it by the computed absolute path so the same missing
          // target referenced from different files merges into one node
          targetId = toId(res.candidate) + " (missing)";
          addNode(targetId, { label: res.source, ext: null, external: false, project: null, unresolved: true });
        }
      } else if (res.kind === "cross-project") {
        if (res.resolved) {
          targetId = toId(res.resolved);
          if (!nodes.has(targetId)) {
            addNode(targetId, { label: targetId, ext: path.extname(res.resolved), external: false, project: res.project.id });
          }
        } else {
          // package name matches a sibling project but the exact file
          // (its "main" entry or subpath) couldn't be found - still show
          // it as that project's public interface rather than dropping it
          targetId = `${res.source} (${res.project.id} interface)`;
          addNode(targetId, { label: res.source, ext: null, external: false, project: res.project.id, crossProjectInterface: true });
        }
      } else {
        // plain third-party external package
        if (!includeExternal) continue;
        targetId = res.source;
        addNode(targetId, { label: res.source, ext: null, external: true, project: null });
      }

      edges.push({ from: id, to: targetId, kind: ref.kind, names: ref.names });
    }
  }

  // An edge "crosses a project" whenever its two ends belong to different
  // detected projects - whether that's because of a package-name match
  // (require('shared-utils')) or a relative import that just happens to
  // reach into a sibling project's folder (require('../../other-pkg/x')).
  for (const e of edges) {
    const fromNode = nodes.get(e.from);
    const toNode = nodes.get(e.to);
    e.crossProject = !!(fromNode && toNode && fromNode.project && toNode.project && fromNode.project !== toNode.project);
  }

  const cycles = findCycles(nodes, edges);
  const diffInfo = diff !== undefined ? applyDiff(absRoot, nodes, edges, diff) : null;
  const projectGraph = buildProjectGraph(projects, nodes, edges);

  return {
    nodes: Array.from(nodes.values()),
    edges,
    stats: {
      fileCount: files.length,
      edgeCount: edges.length,
      parseErrorCount: parseErrors.length,
      parseErrors,
      externalCount: Array.from(nodes.values()).filter((n) => n.external).length,
      builtinSkippedCount,
      cycleCount: cycles.length,
      cycles,
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      projectGraph,
      diff: diffInfo,
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

/**
 * Marks files changed per `diffSpec` as `changed`, and - by walking the
 * reverse dependency graph - everything that transitively imports a
 * changed file as `impacted`. This is the "blast radius" of a diff.
 */
function applyDiff(absRoot, nodes, edges, diffSpec) {
  const { gitRoot, files, error } = getChangedFiles(absRoot, diffSpec || undefined);

  const changedIds = new Set();
  const changedOutOfScope = [];
  for (const absFile of files) {
    const rel = path.relative(absRoot, absFile);
    if (rel.startsWith("..")) continue; // changed file outside the scanned directory
    const id = rel.split(path.sep).join("/");
    if (nodes.has(id)) {
      changedIds.add(id);
      nodes.get(id).changed = true;
    } else {
      changedOutOfScope.push(id);
    }
  }

  const impacted = computeImpact(nodes, edges, changedIds);
  for (const id of impacted) {
    nodes.get(id).impacted = true;
  }

  return {
    spec: diffSpec || "HEAD",
    gitRoot,
    error,
    changedCount: changedIds.size,
    impactedCount: impacted.size,
    changedOutOfScope,
  };
}

/** BFS over reversed edges from `changedIds` to find every downstream importer. */
function computeImpact(nodes, edges, changedIds) {
  const reverseAdjacency = new Map();
  for (const id of nodes.keys()) reverseAdjacency.set(id, []);
  for (const e of edges) {
    if (reverseAdjacency.has(e.to)) reverseAdjacency.get(e.to).push(e.from);
  }

  const impacted = new Set();
  const seen = new Set(changedIds);
  const queue = Array.from(changedIds);

  while (queue.length) {
    const current = queue.shift();
    for (const importer of reverseAdjacency.get(current) || []) {
      if (!seen.has(importer)) {
        seen.add(importer);
        impacted.add(importer);
        queue.push(importer);
      }
    }
  }

  return impacted;
}

/**
 * Collapses the file-level graph into a project-level graph: one node per
 * detected sub-project, with edges aggregating every file-level import
 * that crosses a project boundary (via package-name resolution or via a
 * relative import that happens to reach into another project's folder).
 * Plain external/third-party dependencies never appear here.
 */
function buildProjectGraph(projects, nodes, edges) {
  if (projects.length < 2) return { nodes: [], edges: [] };

  const fileCounts = new Map(projects.map((p) => [p.id, 0]));
  for (const n of nodes.values()) {
    if (n.project && !n.external && fileCounts.has(n.project)) {
      fileCounts.set(n.project, fileCounts.get(n.project) + 1);
    }
  }

  const projectNodes = projects.map((p) => ({ id: p.id, name: p.name, fileCount: fileCounts.get(p.id) || 0 }));

  const edgeCounts = new Map();
  for (const e of edges) {
    const fromNode = nodes.get(e.from);
    const toNode = nodes.get(e.to);
    if (!fromNode || !toNode || !fromNode.project || !toNode.project) continue;
    if (fromNode.project === toNode.project) continue;

    const key = `${fromNode.project}->${toNode.project}`;
    edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
  }

  const projectEdges = Array.from(edgeCounts.entries()).map(([key, count]) => {
    const [from, to] = key.split("->");
    return { from, to, count };
  });

  return { nodes: projectNodes, edges: projectEdges };
}

module.exports = { buildGraph };
