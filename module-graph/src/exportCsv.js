function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns, rows) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(row[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

/**
 * The dependency tree as a flat table: one row per import/require edge.
 * This is "the same tree" as the graph, just as `from,to` relationships -
 * easy to open in Excel/Sheets, pivot, or diff between two runs.
 */
function edgesToCsv(graph) {
  const columns = ["from", "to", "kind", "crossProject", "names"];
  const rows = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
    kind: e.kind,
    crossProject: e.crossProject ? "yes" : "",
    names: (e.names || []).join("|"),
  }));
  return toCsv(columns, rows);
}

/** One row per file/package node, with the metadata used to color/filter the graph. */
function nodesToCsv(graph) {
  const columns = [
    "id",
    "external",
    "project",
    "isEntry",
    "isLeaf",
    "isIsolated",
    "unresolved",
    "parseError",
    "changed",
    "impacted",
    "descendantCount",
    "maxDepthDown",
    "ancestorCount",
    "maxDepthUp",
  ];
  const rows = graph.nodes.map((n) => ({
    id: n.id,
    external: n.external ? "yes" : "",
    project: n.project || "",
    isEntry: n.isEntry ? "yes" : "",
    isLeaf: n.isLeaf ? "yes" : "",
    isIsolated: n.isIsolated ? "yes" : "",
    unresolved: n.unresolved ? "yes" : "",
    parseError: n.parseError || "",
    changed: n.changed ? "yes" : "",
    impacted: n.impacted ? "yes" : "",
    descendantCount: n.descendantCount,
    maxDepthDown: n.maxDepthDown,
    ancestorCount: n.ancestorCount,
    maxDepthUp: n.maxDepthUp,
  }));
  return toCsv(columns, rows);
}

module.exports = { edgesToCsv, nodesToCsv };
