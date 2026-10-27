const path = require("path");
const { scanDirectory, DEFAULT_IGNORE_DIRS } = require("./scan");
const { parseFile } = require("./parseFile");
const { extractImports } = require("./extractImports");
const { extractInterfaces } = require("./extractInterfaces");
const { resolveModule } = require("./resolveModule");
const { findProjects, projectForFile } = require("./projects");
const { getChangedFiles } = require("./gitDiff");

/**
 * Scans `rootDir`, parses every source file, extracts its module
 * references and resolves them, producing a dependency graph:
 *
 *   {
 *     nodes: [{ id, label, ext, external, project, changed, impacted,
 *               isEntry, isLeaf, isIsolated, descendantCount, maxDepthDown,
 *               ancestorCount, maxDepthUp, ... }],
 *     edges: [{ from, to, kind, names, crossProject }],
 *     stats: { fileCount, edgeCount, parseErrors, externalCount, cycles,
 *              builtinSkippedCount, projects, projectGraph, interfaceGraph, diff }
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
 *   extraBuiltins    - array of extra module names to treat as "standard
 *                      library" and exclude from the graph, on top of
 *                      Node's own builtinModules (default: none)
 *   skipBuiltinFilter - don't exclude builtins at all; show them as
 *                      regular external nodes instead (default: false)
 */
function buildGraph(rootDir, { includeExternal = true, extensions, ignoreDirs, enableProjects = true, diff, extraBuiltins, skipBuiltinFilter = false } = {}) {
  const absRoot = path.resolve(rootDir);
  const effectiveIgnoreDirs = ignoreDirs || DEFAULT_IGNORE_DIRS;
  const files = scanDirectory(absRoot, { extensions, ignoreDirs: effectiveIgnoreDirs });
  const projects = enableProjects ? findProjects(absRoot, effectiveIgnoreDirs) : [];

  const nodes = new Map();
  const edges = [];
  const parseErrors = [];
  let builtinSkippedCount = 0;
  const extraBuiltinsSet = extraBuiltins && extraBuiltins.length ? new Set(extraBuiltins) : undefined;

  const interfaceDeclarations = []; // { name, kind, file }
  const interfaceImplementations = []; // { file, className, interfaceName, relation }

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
      const res = resolveModule(absFile, ref.source, { projects, extraBuiltins: extraBuiltinsSet, skipBuiltinFilter });

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

    const { declarations, implementations } = extractInterfaces(ast);
    declarations.forEach((d) => interfaceDeclarations.push({ ...d, file: id }));
    implementations.forEach((impl) => interfaceImplementations.push({ ...impl, file: id }));
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

  computeRoles(nodes, edges);
  computeReachability(nodes, edges);

  const cycles = findCycles(nodes, edges);
  const diffInfo = diff !== undefined ? applyDiff(absRoot, nodes, edges, diff) : null;
  const projectGraph = buildProjectGraph(projects, nodes, edges);
  const interfaceGraph = buildInterfaceGraph(interfaceDeclarations, interfaceImplementations);

  return {
    nodes: Array.from(nodes.values()),
    edges,
    stats: {
      fileCount: files.length,
      edgeCount: edges.length,
      parseErrorCount: parseErrors.length,
      parseErrors,
      externalCount: Array.from(nodes.values()).filter((n) => n.external).length,
      isolatedCount: Array.from(nodes.values()).filter((n) => n.isIsolated).length,
      builtinSkippedCount,
      cycleCount: cycles.length,
      cycles,
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      projectGraph,
      interfaceGraph,
      diff: diffInfo,
    },
  };
}

/**
 * Role flags used to drive the default view: `isEntry` nodes (nothing
 * internal imports them) are the roots progressive disclosure starts
 * from, `isLeaf` nodes import nothing further, and `isIsolated` nodes
 * are both - standalone files disconnected from the rest of the graph,
 * which the UI lists separately instead of cluttering the graph with them.
 */
function computeRoles(nodes, edges) {
  const incoming = new Map();
  const outgoing = new Map();
  for (const id of nodes.keys()) {
    incoming.set(id, 0);
    outgoing.set(id, 0);
  }
  for (const e of edges) {
    if (outgoing.has(e.from)) outgoing.set(e.from, outgoing.get(e.from) + 1);
    if (incoming.has(e.to)) incoming.set(e.to, incoming.get(e.to) + 1);
  }

  for (const [id, node] of nodes) {
    const inc = incoming.get(id) || 0;
    const out = outgoing.get(id) || 0;
    node.isEntry = inc === 0 && out > 0;
    node.isLeaf = out === 0 && inc > 0;
    node.isIsolated = inc === 0 && out === 0;
  }
}

/**
 * For every node, how much is reachable below it (its dependencies,
 * transitively) and above it (everything that transitively imports it).
 * Powers the "+N deps, depth D" / "used by N, depth D" badges a
 * collapsed node shows before you expand it.
 */
function computeReachability(nodes, edges) {
  const forwardAdjacency = new Map();
  const backwardAdjacency = new Map();
  for (const id of nodes.keys()) {
    forwardAdjacency.set(id, []);
    backwardAdjacency.set(id, []);
  }
  for (const e of edges) {
    if (forwardAdjacency.has(e.from) && forwardAdjacency.has(e.to)) {
      forwardAdjacency.get(e.from).push(e.to);
      backwardAdjacency.get(e.to).push(e.from);
    }
  }

  const bfs = (startId, adjacency) => {
    const visited = new Set([startId]);
    const queue = [[startId, 0]];
    let maxDepth = 0;
    let qi = 0;
    while (qi < queue.length) {
      const [current, depth] = queue[qi++];
      for (const next of adjacency.get(current) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          maxDepth = Math.max(maxDepth, depth + 1);
          queue.push([next, depth + 1]);
        }
      }
    }
    return { count: visited.size - 1, maxDepth };
  };

  for (const [id, node] of nodes) {
    const down = bfs(id, forwardAdjacency);
    const up = bfs(id, backwardAdjacency);
    node.descendantCount = down.count;
    node.maxDepthDown = down.maxDepth;
    node.ancestorCount = up.count;
    node.maxDepthUp = up.maxDepth;
  }
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

/**
 * Builds the interface/DI realization graph: one node per interface (or
 * abstract class) declaration and per implementing class, with an edge
 * from each implementing class to the interface(s) it realizes. This is
 * what makes "a bunch of modules depend on an interface, and some other
 * class gets injected as the implementation" visible as a shape instead
 * of being buried in a DI container's wiring code.
 *
 * `extends` of an ordinary concrete class is *not* included here (that's
 * just regular inheritance, not the interface/DI pattern) - only when the
 * extended name actually resolves to a declared interface/abstract class.
 * `implements` always counts, even if the interface's declaration isn't
 * in this scan (e.g. it comes from a .d.ts or node_modules) - in that
 * case a placeholder node is still shown so the relationship isn't lost.
 */
function buildInterfaceGraph(declarations, implementations) {
  const declByName = new Map();
  declarations.forEach((d) => {
    if (!declByName.has(d.name)) declByName.set(d.name, []);
    declByName.get(d.name).push(d);
  });

  const nodesById = new Map();
  const addInterfaceNode = (id, attrs) => {
    if (!nodesById.has(id)) nodesById.set(id, { id, ...attrs });
  };

  declarations.forEach((d) => {
    addInterfaceNode(`${d.file}::${d.name}`, { label: d.name, kind: d.kind, file: d.file });
  });

  const edges = [];
  implementations.forEach((impl) => {
    const matches = declByName.get(impl.interfaceName) || [];
    const realMatches = matches.filter((m) => m.kind === "interface" || m.kind === "abstract-class");

    if (impl.relation === "extends" && realMatches.length === 0) {
      return; // ordinary class inheritance, not an interface/abstract-class realization
    }

    const classId = `${impl.file}::${impl.className}`;
    addInterfaceNode(classId, { label: impl.className, kind: "class", file: impl.file });

    if (realMatches.length === 0) {
      const phantomId = `(unresolved)::${impl.interfaceName}`;
      addInterfaceNode(phantomId, { label: impl.interfaceName, kind: "interface", file: null, unresolved: true });
      edges.push({ from: classId, to: phantomId, relation: impl.relation });
    } else {
      realMatches.forEach((m) => {
        edges.push({ from: classId, to: `${m.file}::${m.name}`, relation: impl.relation });
      });
    }
  });

  return { nodes: Array.from(nodesById.values()), edges };
}

module.exports = { buildGraph };
