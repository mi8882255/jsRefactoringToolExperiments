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
    parseError: "#f5a524"
  };

  function dirOf(id) {
    var i = id.lastIndexOf("/");
    return i === -1 ? "." : id.substring(0, i);
  }

  function nodeColor(n) {
    if (n.parseError) return COLORS.parseError;
    if (n.unresolved) return COLORS.unresolved;
    if (n.external) return COLORS.external;
    return COLORS.internal;
  }

  function buildVisData(graph, opts) {
    var showExternal = opts.showExternal;
    var nodesById = {};
    graph.nodes.forEach(function (n) { nodesById[n.id] = n; });

    var incoming = {};
    graph.edges.forEach(function (e) {
      incoming[e.to] = (incoming[e.to] || 0) + 1;
    });

    var visibleNodes = graph.nodes.filter(function (n) {
      return showExternal || !n.external;
    });
    var visibleIds = {};
    visibleNodes.forEach(function (n) { visibleIds[n.id] = true; });

    var visibleEdges = graph.edges.filter(function (e) {
      return visibleIds[e.from] && visibleIds[e.to];
    });

    var nodes = visibleNodes.map(function (n) {
      var isEntry = !n.external && !incoming[n.id];
      return {
        id: n.id,
        label: n.label.split("/").pop(),
        title: n.label + (n.parseError ? ("\\nParse error: " + n.parseError) : ""),
        color: isEntry && !n.unresolved ? COLORS.entry : nodeColor(n),
        shape: n.external ? "box" : "ellipse",
        group: n.external ? "external" : dirOf(n.id),
        font: { color: "#1b1f24" }
      };
    });

    var edges = visibleEdges.map(function (e, i) {
      return {
        id: i,
        from: e.from,
        to: e.to,
        arrows: "to",
        title: e.kind + (e.names && e.names.length ? ": " + e.names.join(", ") : ""),
        color: { color: e.kind.indexOf("type") !== -1 ? "#c2c7d0" : "#8a8f98", opacity: 0.6 },
        dashes: e.kind === "dynamic-import"
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
    html += "<div><b>" + s.cycleCount + "</b> circular dependency chain(s)</div>";
    if (s.parseErrorCount) {
      html += "<div style='color:" + COLORS.parseError + "'><b>" + s.parseErrorCount + "</b> parse error(s)</div>";
    }
    if (s.cycles && s.cycles.length) {
      html += "<details style='margin-top:8px'><summary>Cycles</summary><ul style='margin:4px 0 0 16px;padding:0'>";
      s.cycles.slice(0, 50).forEach(function (cycle) {
        html += "<li style='font-size:12px'>" + cycle.join(" &rarr; ") + "</li>";
      });
      html += "</ul></details>";
    }
    return html;
  }

  function init(graph) {
    var container = document.getElementById("network");
    var state = { showExternal: true };

    var data = buildVisData(graph, state);
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
      var d = buildVisData(graph, state);
      nodesDS.clear(); nodesDS.add(d.nodes);
      edgesDS.clear(); edgesDS.add(d.edges);
    }

    document.getElementById("toggle-external").addEventListener("change", function (e) {
      state.showExternal = e.target.checked;
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

      var incomingList = graph.edges.filter(function (e) { return e.to === id; }).map(function (e) { return e.from; });
      var outgoingList = graph.edges.filter(function (e) { return e.from === id; }).map(function (e) { return e.to; });
      var panel = document.getElementById("detail");
      panel.innerHTML =
        "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + id + "</h3>" +
        "<div style='font-size:12px;color:#666'>imported by (" + incomingList.length + "):</div>" +
        "<ul style='font-size:12px;margin:2px 0 8px 16px;padding:0'>" + incomingList.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" +
        "<div style='font-size:12px;color:#666'>imports (" + outgoingList.length + "):</div>" +
        "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + outgoingList.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
    });

    network.on("deselectNode", function () {
      var all = nodesDS.getIds();
      nodesDS.update(all.map(function (nid) { return { id: nid, opacity: 1 }; }));
      document.getElementById("detail").innerHTML = "<div style='color:#888;font-size:12px'>Click a node to see its connections.</div>";
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
