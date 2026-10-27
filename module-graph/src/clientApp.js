// Shared client-side viewer. Works both standalone (data embedded as
// window.__GRAPH_DATA__) and in --serve mode (data fetched from /api/graph).
function clientAppSource() {
  return `
(function () {
  "use strict";

  var COLORS = {
    internal: "#4f8ef7",
    entry: "#22b36b",
    external: "#a0a4ad",
    unresolved: "#e5484d",
    parseError: "#f5a524",
    crossProjectInterface: "#c77dff"
  };
  var BORDER = {
    changed: "#d7263d",
    impacted: "#f2a900"
  };
  var PROJECT_PALETTE = ["#4f8ef7", "#22b36b", "#c77dff", "#f2a900", "#e5484d", "#2dd4bf", "#f472b6", "#a3a83a"];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function nodeTitle(n) {
    var t = n.label;
    if (n.project) t += "\\nproject: " + n.project;
    if (n.changed) t += "\\n[CHANGED]";
    if (n.impacted) t += "\\n[IMPACTED by changed files]";
    if (n.parseError) t += "\\nParse error: " + n.parseError;
    return t;
  }

  function buildFileVisData(graph, state) {
    var incoming = {};
    graph.edges.forEach(function (e) {
      incoming[e.to] = (incoming[e.to] || 0) + 1;
    });

    var visibleNodes = graph.nodes.filter(function (n) {
      if (state.onlyAffected) return n.changed || n.impacted;
      return state.showExternal || !n.external;
    });
    var visibleIds = {};
    visibleNodes.forEach(function (n) { visibleIds[n.id] = true; });

    var visibleEdges = graph.edges.filter(function (e) {
      return visibleIds[e.from] && visibleIds[e.to];
    });

    var nodes = visibleNodes.map(function (n) {
      var isEntry = !n.external && !n.crossProjectInterface && !incoming[n.id];
      var fill = n.parseError ? COLORS.parseError
        : n.unresolved ? COLORS.unresolved
        : n.crossProjectInterface ? COLORS.crossProjectInterface
        : n.external ? COLORS.external
        : isEntry ? COLORS.entry
        : COLORS.internal;
      var borderColor = n.changed ? BORDER.changed : n.impacted ? BORDER.impacted : fill;
      var borderWidth = n.changed ? 4 : n.impacted ? 3 : 1;

      return {
        id: n.id,
        label: n.label.split("/").pop(),
        title: nodeTitle(n),
        color: { background: fill, border: borderColor },
        borderWidth: borderWidth,
        shape: n.external || n.crossProjectInterface ? "box" : "ellipse",
        font: { color: "#1b1f24" }
      };
    });

    var edges = visibleEdges.map(function (e, i) {
      var baseColor = e.kind.indexOf("type") !== -1 ? "#c2c7d0" : "#8a8f98";
      return {
        id: i,
        from: e.from,
        to: e.to,
        arrows: "to",
        title: e.kind + (e.crossProject ? " [cross-project]" : "") + (e.names && e.names.length ? ": " + e.names.join(", ") : ""),
        color: { color: e.crossProject ? "#7c3aed" : baseColor, opacity: e.crossProject ? 0.9 : 0.6 },
        width: e.crossProject ? 2 : 1,
        dashes: e.kind === "dynamic-import"
      };
    });

    return { nodes: nodes, edges: edges };
  }

  function buildProjectVisData(graph) {
    var pg = graph.stats.projectGraph;
    var maxCount = 1;
    pg.edges.forEach(function (e) { if (e.count > maxCount) maxCount = e.count; });

    var nodes = pg.nodes.map(function (p, i) {
      var color = PROJECT_PALETTE[i % PROJECT_PALETTE.length];
      return {
        id: p.id,
        label: p.name + "\\n(" + p.fileCount + " files)",
        title: p.id,
        shape: "box",
        color: { background: color, border: color },
        size: 20 + Math.min(40, p.fileCount),
        font: { color: "#ffffff" }
      };
    });

    var edges = pg.edges.map(function (e, i) {
      return {
        id: i,
        from: e.from,
        to: e.to,
        arrows: "to",
        label: String(e.count),
        title: e.count + " cross-project import(s)",
        width: 1 + 6 * (e.count / maxCount),
        color: { color: "#7c3aed" },
        font: { size: 11, color: "#555" }
      };
    });

    return { nodes: nodes, edges: edges };
  }

  function renderStats(graph) {
    var s = graph.stats;
    var html = "";
    html += "<div><b>" + s.fileCount + "</b> files</div>";
    html += "<div><b>" + s.edgeCount + "</b> dependency edges</div>";
    html += "<div><b>" + s.externalCount + "</b> external packages</div>";
    if (s.builtinSkippedCount) {
      html += "<div><b>" + s.builtinSkippedCount + "</b> Node builtin imports (excluded)</div>";
    }
    html += "<div><b>" + s.cycleCount + "</b> circular dependency chain(s)</div>";
    if (s.parseErrorCount) {
      html += "<div style='color:" + COLORS.parseError + "'><b>" + s.parseErrorCount + "</b> parse error(s)</div>";
    }
    if (s.projects && s.projects.length > 1) {
      html += "<div><b>" + s.projects.length + "</b> sub-projects detected</div>";
    }
    if (s.diff) {
      if (s.diff.error) {
        html += "<div style='color:" + COLORS.parseError + "'>diff: " + escapeHtml(s.diff.error) + "</div>";
      } else {
        html += "<div style='margin-top:6px;padding-top:6px;border-top:1px dashed #e1e4e8'>";
        html += "diff <code>" + escapeHtml(s.diff.spec) + "</code>: ";
        html += "<b style='color:" + BORDER.changed + "'>" + s.diff.changedCount + "</b> changed, ";
        html += "<b style='color:" + BORDER.impacted + "'>" + s.diff.impactedCount + "</b> impacted";
        html += "</div>";
        if (s.diff.changedOutOfScope && s.diff.changedOutOfScope.length) {
          html += "<div style='font-size:11px;color:#888'>(+" + s.diff.changedOutOfScope.length + " changed file(s) outside this scan's scope)</div>";
        }
      }
    }
    if (s.cycles && s.cycles.length) {
      html += "<details style='margin-top:8px'><summary>Cycles</summary><ul style='margin:4px 0 0 16px;padding:0'>";
      s.cycles.slice(0, 50).forEach(function (cycle) {
        html += "<li style='font-size:12px'>" + cycle.map(escapeHtml).join(" &rarr; ") + "</li>";
      });
      html += "</ul></details>";
    }
    return html;
  }

  function clearDetail() {
    document.getElementById("detail").innerHTML = "<div style='color:#888;font-size:12px'>Click a node to see its connections.</div>";
  }

  function init(graph) {
    var container = document.getElementById("network");
    var hasDiff = !!(graph.stats.diff && !graph.stats.diff.error);
    var hasProjects = graph.stats.projects && graph.stats.projects.length > 1;
    var state = { showExternal: true, onlyAffected: false, mode: "file" };

    document.getElementById("only-affected-wrap").style.display = hasDiff ? "block" : "none";
    document.getElementById("mode-switch").style.display = hasProjects ? "block" : "none";
    document.getElementById("legend-crossproject").style.display = hasProjects ? "block" : "none";
    document.getElementById("legend-diff").style.display = hasDiff ? "block" : "none";

    function currentData() {
      return state.mode === "project" ? buildProjectVisData(graph) : buildFileVisData(graph, state);
    }

    var data = currentData();
    var nodesDS = new vis.DataSet(data.nodes);
    var edgesDS = new vis.DataSet(data.edges);

    var network = new vis.Network(container, { nodes: nodesDS, edges: edgesDS }, {
      physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -60, springLength: 120, avoidOverlap: 0.6 }, stabilization: { iterations: 200 } },
      interaction: { hover: true, tooltipDelay: 120 },
      edges: { smooth: { type: "continuous" } },
      nodes: { borderWidth: 1, size: 14 }
    });

    document.getElementById("stats").innerHTML = renderStats(graph);

    function refreshView() {
      var d = currentData();
      nodesDS.clear(); nodesDS.add(d.nodes);
      edgesDS.clear(); edgesDS.add(d.edges);
      clearDetail();
    }

    document.getElementById("file-controls").style.display = state.mode === "file" ? "block" : "none";

    document.getElementById("mode-file").addEventListener("click", function () {
      state.mode = "file";
      document.getElementById("mode-file").classList.add("active");
      document.getElementById("mode-project").classList.remove("active");
      document.getElementById("file-controls").style.display = "block";
      refreshView();
    });
    document.getElementById("mode-project").addEventListener("click", function () {
      state.mode = "project";
      document.getElementById("mode-project").classList.add("active");
      document.getElementById("mode-file").classList.remove("active");
      document.getElementById("file-controls").style.display = "none";
      refreshView();
    });

    document.getElementById("toggle-external").addEventListener("change", function (e) {
      state.showExternal = e.target.checked;
      refreshView();
    });

    document.getElementById("only-affected").addEventListener("change", function (e) {
      state.onlyAffected = e.target.checked;
      refreshView();
    });

    document.getElementById("search").addEventListener("input", function (e) {
      var q = e.target.value.trim().toLowerCase();
      if (!q) { nodesDS.forEach(function (n) { nodesDS.update({ id: n.id, hidden: false }); }); return; }
      nodesDS.forEach(function (n) {
        nodesDS.update({ id: n.id, hidden: n.id.toLowerCase().indexOf(q) === -1 });
      });
    });

    network.on("selectNode", function (params) {
      var id = params.nodes[0];
      var connected = network.getConnectedNodes(id);
      var all = nodesDS.getIds();
      nodesDS.update(all.map(function (nid) {
        var dim = nid !== id && connected.indexOf(nid) === -1;
        return { id: nid, opacity: dim ? 0.15 : 1 };
      }));

      var panel = document.getElementById("detail");
      if (state.mode === "project") {
        var pg = graph.stats.projectGraph;
        var dependsOn = pg.edges.filter(function (e) { return e.from === id; });
        var usedBy = pg.edges.filter(function (e) { return e.to === id; });
        panel.innerHTML =
          "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(id) + "</h3>" +
          "<div style='font-size:12px;color:#666'>depends on:</div>" +
          "<ul style='font-size:12px;margin:2px 0 8px 16px;padding:0'>" + dependsOn.map(function (e) { return "<li>" + escapeHtml(e.to) + " (" + e.count + ")</li>"; }).join("") + "</ul>" +
          "<div style='font-size:12px;color:#666'>used by:</div>" +
          "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + usedBy.map(function (e) { return "<li>" + escapeHtml(e.from) + " (" + e.count + ")</li>"; }).join("") + "</ul>";
        return;
      }

      var incomingList = graph.edges.filter(function (e) { return e.to === id; }).map(function (e) { return e.from; });
      var outgoingList = graph.edges.filter(function (e) { return e.from === id; }).map(function (e) { return e.to; });
      var node = graph.nodes.filter(function (n) { return n.id === id; })[0] || {};
      var flags = [];
      if (node.changed) flags.push("<span style='color:" + BORDER.changed + "'>changed</span>");
      if (node.impacted) flags.push("<span style='color:" + BORDER.impacted + "'>impacted</span>");
      if (node.project) flags.push("project: " + escapeHtml(node.project));

      panel.innerHTML =
        "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(id) + "</h3>" +
        (flags.length ? "<div style='font-size:12px;margin-bottom:6px'>" + flags.join(" &middot; ") + "</div>" : "") +
        "<div style='font-size:12px;color:#666'>imported by (" + incomingList.length + "):</div>" +
        "<ul style='font-size:12px;margin:2px 0 8px 16px;padding:0'>" + incomingList.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul>" +
        "<div style='font-size:12px;color:#666'>imports (" + outgoingList.length + "):</div>" +
        "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + outgoingList.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul>";
    });

    network.on("deselectNode", function () {
      var all = nodesDS.getIds();
      nodesDS.update(all.map(function (nid) { return { id: nid, opacity: 1 }; }));
      clearDetail();
    });

    var rescanBtn = document.getElementById("rescan");
    if (rescanBtn) {
      rescanBtn.addEventListener("click", function () {
        rescanBtn.disabled = true;
        rescanBtn.textContent = "Rescanning...";
        fetch("/api/graph")
          .then(function (r) { return r.json(); })
          .then(function (freshGraph) {
            graph = freshGraph;
            hasDiff = !!(graph.stats.diff && !graph.stats.diff.error);
            hasProjects = graph.stats.projects && graph.stats.projects.length > 1;
            document.getElementById("only-affected-wrap").style.display = hasDiff ? "block" : "none";
            document.getElementById("mode-switch").style.display = hasProjects ? "block" : "none";
            document.getElementById("legend-crossproject").style.display = hasProjects ? "block" : "none";
            document.getElementById("legend-diff").style.display = hasDiff ? "block" : "none";
            refreshView();
            document.getElementById("stats").innerHTML = renderStats(graph);
          })
          .finally(function () {
            rescanBtn.disabled = false;
            rescanBtn.textContent = "Rescan";
          });
      });
    }
  }

  function boot() {
    if (window.__GRAPH_DATA__) {
      init(window.__GRAPH_DATA__);
    } else {
      fetch("/api/graph").then(function (r) { return r.json(); }).then(init);
    }
  }

  boot();
})();
`;
}

module.exports = { clientAppSource };
