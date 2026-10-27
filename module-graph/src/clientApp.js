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

  // ---------------------------------------------------------------------
  // adjacency helpers (shared by visibility computation and the detail panel)
  // ---------------------------------------------------------------------
  function buildAdjacency(graph) {
    var childrenOf = {}, parentsOf = {};
    graph.edges.forEach(function (e) {
      (childrenOf[e.from] = childrenOf[e.from] || []).push(e.to);
      (parentsOf[e.to] = parentsOf[e.to] || []).push(e.from);
    });
    return { childrenOf: childrenOf, parentsOf: parentsOf };
  }

  function buildInterfaceIndex(interfaceGraph) {
    var byFile = {}; // file -> [interfaceGraph node ids declared/implemented in that file]
    interfaceGraph.nodes.forEach(function (n) {
      if (!n.file) return;
      (byFile[n.file] = byFile[n.file] || []).push(n.id);
    });
    var incomingTo = {}, outgoingFrom = {};
    interfaceGraph.edges.forEach(function (e) {
      (incomingTo[e.to] = incomingTo[e.to] || []).push(e);
      (outgoingFrom[e.from] = outgoingFrom[e.from] || []).push(e);
    });
    var nodesById = {};
    interfaceGraph.nodes.forEach(function (n) { nodesById[n.id] = n; });
    return { byFile: byFile, incomingTo: incomingTo, outgoingFrom: outgoingFrom, nodesById: nodesById };
  }

  // ---------------------------------------------------------------------
  // File graph: progressive disclosure (only entry points shown by
  // default; expanding a node reveals its direct children/parents)
  // ---------------------------------------------------------------------
  function computeVisibleSet(graph, state, adjacency) {
    var visible = {};

    if (state.showEverything) {
      graph.nodes.forEach(function (n) {
        if (state.showExternal || !n.external) visible[n.id] = true;
      });
      return visible;
    }

    var entries = graph.nodes.filter(function (n) { return n.isEntry; });
    if (entries.length === 0) {
      // degenerate case (e.g. pure cycle, no clear root) - fall back to showing everything
      graph.nodes.forEach(function (n) {
        if (!n.external) visible[n.id] = true;
      });
      return visible;
    }

    entries.forEach(function (n) { visible[n.id] = true; });
    state.expandedForward.forEach(function (id) {
      (adjacency.childrenOf[id] || []).forEach(function (c) { visible[c] = true; });
    });
    state.expandedBackward.forEach(function (id) {
      (adjacency.parentsOf[id] || []).forEach(function (p) { visible[p] = true; });
    });

    if (!state.showExternal) {
      Object.keys(visible).forEach(function (id) {
        var n = graph.byId[id];
        if (n && n.external) delete visible[id];
      });
    }

    return visible;
  }

  function nodeTitle(n) {
    var t = n.label;
    if (n.project) t += "\\nproject: " + n.project;
    if (n.changed) t += "\\n[CHANGED]";
    if (n.impacted) t += "\\n[IMPACTED by changed files]";
    if (n.parseError) t += "\\nParse error: " + n.parseError;
    return t;
  }

  function badgeFor(n, state, adjacency) {
    if (state.showEverything) return "";
    var parts = [];
    var hasMoreDown = (adjacency.childrenOf[n.id] || []).length > 0 && !state.expandedForward.has(n.id);
    var hasMoreUp = (adjacency.parentsOf[n.id] || []).length > 0 && !state.expandedBackward.has(n.id);
    if (hasMoreDown) parts.push("▸" + n.descendantCount + "·d" + n.maxDepthDown);
    if (hasMoreUp) parts.push("◂" + n.ancestorCount + "·d" + n.maxDepthUp);
    return parts.join("  ");
  }

  function buildFileVisData(graph, state, adjacency) {
    var visibleSet = computeVisibleSet(graph, state, adjacency);
    var visibleNodes = graph.nodes.filter(function (n) {
      if (!visibleSet[n.id]) return false;
      if (state.onlyAffected) return n.changed || n.impacted;
      return true;
    });
    var visibleIds = {};
    visibleNodes.forEach(function (n) { visibleIds[n.id] = true; });
    var visibleEdges = graph.edges.filter(function (e) { return visibleIds[e.from] && visibleIds[e.to]; });

    var nodes = visibleNodes.map(function (n) {
      var fill = n.parseError ? COLORS.parseError
        : n.unresolved ? COLORS.unresolved
        : n.crossProjectInterface ? COLORS.crossProjectInterface
        : n.external ? COLORS.external
        : n.isEntry ? COLORS.entry
        : COLORS.internal;
      var borderColor = n.changed ? BORDER.changed : n.impacted ? BORDER.impacted : fill;
      var borderWidth = n.changed ? 4 : n.impacted ? 3 : 1;
      var badge = badgeFor(n, state, adjacency);
      var baseLabel = n.label.split("/").pop();

      return {
        id: n.id,
        label: badge ? baseLabel + "\\n" + badge : baseLabel,
        title: nodeTitle(n),
        color: { background: fill, border: borderColor },
        borderWidth: borderWidth,
        shape: n.external || n.crossProjectInterface ? "box" : "ellipse",
        font: { color: "#1b1f24", multi: false }
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

  // ---------------------------------------------------------------------
  // Project graph (collapsed, aggregated cross-project edges)
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Interfaces graph (UML-ish realization diagram: class --implements--> interface)
  // ---------------------------------------------------------------------
  function buildInterfaceVisData(graph) {
    var ig = graph.stats.interfaceGraph;
    var nodes = ig.nodes.map(function (n) {
      var isInterfaceLike = n.kind === "interface" || n.kind === "abstract-class";
      return {
        id: n.id,
        label: n.label,
        title: n.label + (n.file ? "\\n" + n.file : "\\n(declaration not in this scan)") + "\\n" + n.kind,
        shape: isInterfaceLike ? "diamond" : "ellipse",
        color: n.unresolved
          ? { background: "#fde8e8", border: COLORS.unresolved }
          : isInterfaceLike
          ? { background: "#eef2ff", border: "#6366f1" }
          : { background: "#ecfdf5", border: "#10b981" },
        font: { color: "#1b1f24" }
      };
    });

    var edges = ig.edges.map(function (e, i) {
      return {
        id: i,
        from: e.from,
        to: e.to,
        arrows: "to",
        label: e.relation,
        dashes: true,
        color: { color: "#6366f1" },
        font: { size: 10, color: "#555", align: "middle" }
      };
    });

    return { nodes: nodes, edges: edges };
  }

  // ---------------------------------------------------------------------
  // stats / legend panel
  // ---------------------------------------------------------------------
  function renderStats(graph) {
    var s = graph.stats;
    var html = "";
    html += "<div><b>" + s.fileCount + "</b> files</div>";
    html += "<div><b>" + s.edgeCount + "</b> dependency edges</div>";
    html += "<div><b>" + s.externalCount + "</b> external packages</div>";
    if (s.builtinSkippedCount) {
      html += "<div><b>" + s.builtinSkippedCount + "</b> Node builtin imports (excluded)</div>";
    }
    if (s.isolatedCount) {
      html += "<div><b>" + s.isolatedCount + "</b> isolated file(s) (no imports, not imported)</div>";
    }
    html += "<div><b>" + s.cycleCount + "</b> circular dependency chain(s)</div>";
    if (s.parseErrorCount) {
      html += "<div style='color:" + COLORS.parseError + "'><b>" + s.parseErrorCount + "</b> parse error(s)</div>";
    }
    if (s.projects && s.projects.length > 1) {
      html += "<div><b>" + s.projects.length + "</b> sub-projects detected</div>";
    }
    if (s.interfaceGraph && s.interfaceGraph.edges.length) {
      html += "<div><b>" + s.interfaceGraph.edges.length + "</b> interface/implements link(s)</div>";
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

  function renderIsolatedList(graph) {
    var isolated = graph.nodes.filter(function (n) { return n.isIsolated; });
    var wrap = document.getElementById("isolated-wrap");
    if (!isolated.length) { wrap.style.display = "none"; return; }
    wrap.style.display = "block";
    document.getElementById("isolated-list").innerHTML =
      "<details><summary>" + isolated.length + " isolated file(s) (no imports, not imported)</summary>" +
      "<ul style='margin:4px 0 0 16px;padding:0;font-size:12px;max-height:160px;overflow-y:auto'>" +
      isolated.map(function (n) { return "<li>" + escapeHtml(n.id) + "</li>"; }).join("") +
      "</ul></details>";
  }

  function clearDetail() {
    document.getElementById("detail").innerHTML = "<div style='color:#888;font-size:12px'>Click a node to see its connections.</div>";
  }

  function init(graph) {
    var container = document.getElementById("network");
    var hasDiff = !!(graph.stats.diff && !graph.stats.diff.error);
    var hasProjects = graph.stats.projects && graph.stats.projects.length > 1;
    var hasInterfaces = graph.stats.interfaceGraph && graph.stats.interfaceGraph.edges.length > 0;

    graph.byId = {};
    graph.nodes.forEach(function (n) { graph.byId[n.id] = n; });
    var adjacency = buildAdjacency(graph);
    var ifaceIndex = buildInterfaceIndex(graph.stats.interfaceGraph);

    var state = {
      mode: "file",
      showExternal: true,
      onlyAffected: false,
      showEverything: false,
      expandedForward: new Set(),
      expandedBackward: new Set()
    };

    document.getElementById("only-affected-wrap").style.display = hasDiff ? "block" : "none";
    document.getElementById("mode-project").style.display = hasProjects ? "inline-block" : "none";
    document.getElementById("mode-interfaces").style.display = hasInterfaces ? "inline-block" : "none";
    document.getElementById("legend-crossproject").style.display = hasProjects ? "block" : "none";
    document.getElementById("legend-diff").style.display = hasDiff ? "block" : "none";
    document.getElementById("legend-interfaces").style.display = hasInterfaces ? "block" : "none";

    renderStats(graph);
    document.getElementById("stats").innerHTML = renderStats(graph);
    renderIsolatedList(graph);

    function currentData() {
      if (state.mode === "project") return buildProjectVisData(graph);
      if (state.mode === "interfaces") return buildInterfaceVisData(graph);
      return buildFileVisData(graph, state, adjacency);
    }

    function networkOptionsFor(mode) {
      if (mode === "file") {
        // Deterministic levels (entries left, deeper modules to the right) with
        // physics off entirely - no force simulation means no jitter, and
        // positions settle instantly instead of drifting for a second or two.
        return {
          layout: { hierarchical: { enabled: true, direction: "LR", sortMethod: "directed", levelSeparation: 170, nodeSpacing: 90, treeSpacing: 140 } },
          physics: false,
          interaction: { hover: true, tooltipDelay: 120 },
          edges: { smooth: { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.5 } },
          nodes: { borderWidth: 1, size: 14 }
        };
      }
      return {
        layout: { hierarchical: false },
        physics: { solver: "forceAtlas2Based", forceAtlas2Based: { gravitationalConstant: -60, springLength: 120, avoidOverlap: 0.6 }, stabilization: { iterations: 200 } },
        interaction: { hover: true, tooltipDelay: 120 },
        edges: { smooth: { type: "continuous" } },
        nodes: { borderWidth: 1, size: 14 }
      };
    }

    var nodesDS = new vis.DataSet([]);
    var edgesDS = new vis.DataSet([]);
    var network = null;

    function freezeOnceStable() {
      network.once("stabilizationIterationsDone", function () {
        network.setOptions({ physics: false });
        // expanding/collapsing or switching modes can easily push nodes
        // outside the current viewport - recenter so nothing is hidden
        // off-screen after the layout settles.
        network.fit({ animation: { duration: 300, easingFunction: "easeInOutQuad" } });
      });
    }

    function recreateNetwork() {
      if (network) network.destroy();
      network = new vis.Network(container, { nodes: nodesDS, edges: edgesDS }, networkOptionsFor(state.mode));
      freezeOnceStable();
      wireSelectionEvents();
    }

    function refreshView(recreate) {
      var d = currentData();
      network.setOptions({ physics: networkOptionsFor(state.mode).physics });
      nodesDS.clear(); nodesDS.add(d.nodes);
      edgesDS.clear(); edgesDS.add(d.edges);
      clearDetail();
      if (recreate) {
        recreateNetwork();
      } else {
        freezeOnceStable();
        // stabilizationIterationsDone doesn't reliably fire for small/instant
        // layouts, so also fit immediately rather than relying on it alone.
        network.fit({ animation: { duration: 300, easingFunction: "easeInOutQuad" } });
      }
    }

    function setMode(mode) {
      state.mode = mode;
      ["mode-file", "mode-project", "mode-interfaces"].forEach(function (btnId) {
        document.getElementById(btnId).classList.toggle("active", btnId === "mode-" + mode);
      });
      document.getElementById("file-controls").style.display = mode === "file" ? "block" : "none";
      document.getElementById("isolated-wrap").style.display = mode === "file" && graph.nodes.some(function (n) { return n.isIsolated; }) ? "block" : "none";
      refreshView(true);
    }

    document.getElementById("mode-file").addEventListener("click", function () { setMode("file"); });
    document.getElementById("mode-project").addEventListener("click", function () { setMode("project"); });
    document.getElementById("mode-interfaces").addEventListener("click", function () { setMode("interfaces"); });

    document.getElementById("toggle-external").addEventListener("change", function (e) {
      state.showExternal = e.target.checked;
      refreshView(false);
    });
    document.getElementById("only-affected").addEventListener("change", function (e) {
      state.onlyAffected = e.target.checked;
      refreshView(false);
    });
    document.getElementById("show-everything").addEventListener("change", function (e) {
      state.showEverything = e.target.checked;
      refreshView(false);
    });
    document.getElementById("reset-view").addEventListener("click", function () {
      state.expandedForward = new Set();
      state.expandedBackward = new Set();
      state.showEverything = false;
      document.getElementById("show-everything").checked = false;
      refreshView(false);
    });

    document.getElementById("search").addEventListener("input", function (e) {
      var q = e.target.value.trim().toLowerCase();
      if (!q) { nodesDS.forEach(function (n) { nodesDS.update({ id: n.id, hidden: false }); }); return; }
      nodesDS.forEach(function (n) {
        nodesDS.update({ id: n.id, hidden: String(n.id).toLowerCase().indexOf(q) === -1 });
      });
    });

    function renderFileDetail(id) {
      var node = graph.byId[id];
      if (!node) return "";
      var hasMoreDown = (adjacency.childrenOf[id] || []).length > 0;
      var hasMoreUp = (adjacency.parentsOf[id] || []).length > 0;
      var flags = [];
      if (node.changed) flags.push("<span style='color:" + BORDER.changed + "'>changed</span>");
      if (node.impacted) flags.push("<span style='color:" + BORDER.impacted + "'>impacted</span>");
      if (node.project) flags.push("project: " + escapeHtml(node.project));

      var html = "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(id) + "</h3>";
      if (flags.length) html += "<div style='font-size:12px;margin-bottom:6px'>" + flags.join(" &middot; ") + "</div>";

      if (!state.showEverything) {
        if (hasMoreDown) {
          var fwdOn = state.expandedForward.has(id);
          html += "<button class='detail-btn' id='exp-fwd'>" + (fwdOn ? "▾ Hide dependencies" : "▸ Show dependencies (" + node.descendantCount + " files, depth " + node.maxDepthDown + ")") + "</button>";
        }
        if (hasMoreUp) {
          var bwdOn = state.expandedBackward.has(id);
          html += "<button class='detail-btn' id='exp-bwd'>" + (bwdOn ? "▴ Hide importers" : "◂ Show who imports this (" + node.ancestorCount + " files, depth " + node.maxDepthUp + ")") + "</button>";
        }
      }

      // cross-link to the interface/DI graph, if this file declares or implements something
      var ifaceIds = ifaceIndex.byFile[id] || [];
      ifaceIds.forEach(function (ifaceId) {
        var ifaceNode = ifaceIndex.nodesById[ifaceId];
        if (ifaceNode.kind === "class") {
          var implementsEdges = ifaceIndex.outgoingFrom[ifaceId] || [];
          if (implementsEdges.length) {
            html += "<div style='font-size:12px;margin-top:8px'><b>" + escapeHtml(ifaceNode.label) + "</b> " + implementsEdges[0].relation + ":</div>";
            html += "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + implementsEdges.map(function (e) {
              var target = ifaceIndex.nodesById[e.to];
              return "<li>" + escapeHtml(target.label) + (target.file ? " (" + escapeHtml(target.file) + ")" : " <i>(not in this scan)</i>") + "</li>";
            }).join("") + "</ul>";
          }
        } else {
          var implementedBy = ifaceIndex.incomingTo[ifaceId] || [];
          if (implementedBy.length) {
            html += "<div style='font-size:12px;margin-top:8px'><b>" + escapeHtml(ifaceNode.label) + "</b> realized by:</div>";
            html += "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + implementedBy.map(function (e) {
              var source = ifaceIndex.nodesById[e.from];
              return "<li>" + escapeHtml(source.label) + " (" + escapeHtml(source.file) + ")</li>";
            }).join("") + "</ul>";
          }
        }
      });

      html += "<div style='font-size:12px;color:#666;margin-top:8px'>imported by (" + (adjacency.parentsOf[id] || []).length + "):</div>";
      html += "<ul style='font-size:12px;margin:2px 0 8px 16px;padding:0'>" + (adjacency.parentsOf[id] || []).map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul>";
      html += "<div style='font-size:12px;color:#666'>imports (" + (adjacency.childrenOf[id] || []).length + "):</div>";
      html += "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + (adjacency.childrenOf[id] || []).map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul>";
      return html;
    }

    function renderProjectDetail(id) {
      var pg = graph.stats.projectGraph;
      var dependsOn = pg.edges.filter(function (e) { return e.from === id; });
      var usedBy = pg.edges.filter(function (e) { return e.to === id; });
      return "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(id) + "</h3>" +
        "<div style='font-size:12px;color:#666'>depends on:</div>" +
        "<ul style='font-size:12px;margin:2px 0 8px 16px;padding:0'>" + dependsOn.map(function (e) { return "<li>" + escapeHtml(e.to) + " (" + e.count + ")</li>"; }).join("") + "</ul>" +
        "<div style='font-size:12px;color:#666'>used by:</div>" +
        "<ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" + usedBy.map(function (e) { return "<li>" + escapeHtml(e.from) + " (" + e.count + ")</li>"; }).join("") + "</ul>";
    }

    function renderInterfaceDetail(id) {
      var node = ifaceIndex.nodesById[id];
      var html = "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(node.label) + "</h3>";
      html += "<div style='font-size:12px;color:#666;margin-bottom:6px'>" + node.kind + (node.file ? " in " + escapeHtml(node.file) : " (not found in this scan)") + "</div>";
      var out = ifaceIndex.outgoingFrom[id] || [];
      var inc = ifaceIndex.incomingTo[id] || [];
      if (out.length) {
        html += "<div style='font-size:12px;color:#666'>" + out[0].relation + ":</div><ul style='font-size:12px;margin:2px 0 8px 16px;padding:0'>" +
          out.map(function (e) { var t = ifaceIndex.nodesById[e.to]; return "<li>" + escapeHtml(t.label) + "</li>"; }).join("") + "</ul>";
      }
      if (inc.length) {
        html += "<div style='font-size:12px;color:#666'>realized by:</div><ul style='font-size:12px;margin:2px 0 0 16px;padding:0'>" +
          inc.map(function (e) { var s = ifaceIndex.nodesById[e.from]; return "<li>" + escapeHtml(s.label) + " (" + escapeHtml(s.file) + ")</li>"; }).join("") + "</ul>";
      }
      return html;
    }

    function wireSelectionEvents() {
      network.on("selectNode", function (params) {
        var id = params.nodes[0];
        var connected = network.getConnectedNodes(id);
        var all = nodesDS.getIds();
        nodesDS.update(all.map(function (nid) {
          var dim = nid !== id && connected.indexOf(nid) === -1;
          return { id: nid, opacity: dim ? 0.15 : 1 };
        }));

        var panel = document.getElementById("detail");
        if (state.mode === "project") panel.innerHTML = renderProjectDetail(id);
        else if (state.mode === "interfaces") panel.innerHTML = renderInterfaceDetail(id);
        else {
          panel.innerHTML = renderFileDetail(id);
          var fwdBtn = document.getElementById("exp-fwd");
          if (fwdBtn) fwdBtn.addEventListener("click", function () {
            if (state.expandedForward.has(id)) state.expandedForward.delete(id); else state.expandedForward.add(id);
            refreshView(false);
          });
          var bwdBtn = document.getElementById("exp-bwd");
          if (bwdBtn) bwdBtn.addEventListener("click", function () {
            if (state.expandedBackward.has(id)) state.expandedBackward.delete(id); else state.expandedBackward.add(id);
            refreshView(false);
          });
        }
      });

      network.on("deselectNode", function () {
        var all = nodesDS.getIds();
        nodesDS.update(all.map(function (nid) { return { id: nid, opacity: 1 }; }));
        clearDetail();
      });
    }

    recreateNetwork();
    refreshView(false);

    // exposed for debugging in devtools (and for automated UI tests)
    window.__moduleGraph = { graph: graph, state: state, getNetwork: function () { return network; } };

    var rescanBtn = document.getElementById("rescan");
    if (rescanBtn) {
      rescanBtn.addEventListener("click", function () {
        rescanBtn.disabled = true;
        rescanBtn.textContent = "Rescanning...";
        fetch("/api/graph")
          .then(function (r) { return r.json(); })
          .then(function (freshGraph) {
            graph = freshGraph;
            graph.byId = {};
            graph.nodes.forEach(function (n) { graph.byId[n.id] = n; });
            adjacency = buildAdjacency(graph);
            ifaceIndex = buildInterfaceIndex(graph.stats.interfaceGraph);
            hasDiff = !!(graph.stats.diff && !graph.stats.diff.error);
            hasProjects = graph.stats.projects && graph.stats.projects.length > 1;
            hasInterfaces = graph.stats.interfaceGraph && graph.stats.interfaceGraph.edges.length > 0;
            document.getElementById("only-affected-wrap").style.display = hasDiff ? "block" : "none";
            document.getElementById("mode-project").style.display = hasProjects ? "inline-block" : "none";
            document.getElementById("mode-interfaces").style.display = hasInterfaces ? "inline-block" : "none";
            document.getElementById("legend-crossproject").style.display = hasProjects ? "block" : "none";
            document.getElementById("legend-diff").style.display = hasDiff ? "block" : "none";
            document.getElementById("legend-interfaces").style.display = hasInterfaces ? "block" : "none";
            state.expandedForward = new Set();
            state.expandedBackward = new Set();
            refreshView(false);
            document.getElementById("stats").innerHTML = renderStats(graph);
            renderIsolatedList(graph);
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
