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
  var FOCUS_COLOR = "#7c3aed";
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
  // Assigns a fixed (x, y) to each node the first time it becomes visible,
  // anchored right next to whichever already-placed node revealed it, and
  // never moves it again afterwards. This is what lets expanding/collapsing
  // leave the rest of the graph - and the camera - completely alone: the
  // revealed subtree grows as a branch out of the node you expanded instead
  // of the whole layout being recomputed and the view having to re-fit.
  function makeLayoutPlanner() {
    var LEVEL_SEP = 170, NODE_SPACING = 70;
    var positions = {};
    var nextYByLevel = {};

    function nextY(level) {
      var key = String(level);
      var y = nextYByLevel[key] || 0;
      nextYByLevel[key] = y + NODE_SPACING;
      return y;
    }

    return {
      reset: function () {
        positions = {};
        nextYByLevel = {};
      },
      get: function (id) {
        return positions[id] || null;
      },
      place: function (id, anchorId, direction) {
        if (positions[id]) return positions[id];
        var x, y;
        if (anchorId && positions[anchorId]) {
          x = positions[anchorId].x + (direction === "backward" ? -LEVEL_SEP : LEVEL_SEP);
        } else {
          x = 0;
        }
        y = nextY(x);
        positions[id] = { x: x, y: y };
        return positions[id];
      }
    };
  }

  // Static layered layout for "show everything" and focus views, where many
  // nodes appear at once. vis's own hierarchical layout falls apart on
  // graphs with cycles (it collapses most nodes into one or two giant
  // columns), so levels are computed here instead: BFS depth from the
  // roots of the subgraph (nodes nothing in it imports), with any pure
  // cycle that has no root seeded separately. Within a level, nodes are
  // ordered by the average position of their parents (barycenter) so
  // edges mostly run straight instead of criss-crossing, and tall levels
  // are wrapped into several sub-columns instead of one endless column.
  function layeredLayout(ids, edges) {
    var LEVEL_SEP = 280, SUBCOL_SEP = 170, NODE_SPACING = 42, MAX_PER_COL = 30;
    var inSet = {}, out = {}, inc = {}, indeg = {}, level = {};
    ids.forEach(function (id) { inSet[id] = true; out[id] = []; inc[id] = []; indeg[id] = 0; });
    edges.forEach(function (e) {
      if (inSet[e.from] && inSet[e.to] && e.from !== e.to) {
        out[e.from].push(e.to);
        inc[e.to].push(e.from);
        indeg[e.to]++;
      }
    });

    var queue = [];
    function bfs() {
      for (var qi = 0; qi < queue.length; qi++) {
        var cur = queue[qi];
        out[cur].forEach(function (n) {
          if (level[n] === undefined) { level[n] = level[cur] + 1; queue.push(n); }
        });
      }
      queue = [];
    }
    var sortedIds = ids.slice().sort();
    sortedIds.forEach(function (id) { if (indeg[id] === 0) { level[id] = 0; queue.push(id); } });
    bfs();
    sortedIds.forEach(function (id) {
      if (level[id] === undefined) { level[id] = 0; queue.push(id); bfs(); }
    });

    var byLevel = {};
    sortedIds.forEach(function (id) { (byLevel[level[id]] = byLevel[level[id]] || []).push(id); });
    var levels = Object.keys(byLevel).map(Number).sort(function (a, b) { return a - b; });

    var order = {};
    levels.forEach(function (L) {
      var arr = byLevel[L];
      var bary = {};
      arr.forEach(function (id) {
        var ps = inc[id].filter(function (p) { return order[p] !== undefined; });
        bary[id] = ps.length ? ps.reduce(function (s, p) { return s + order[p]; }, 0) / ps.length : null;
      });
      arr.sort(function (a, b) {
        var ba = bary[a], bb = bary[b];
        if (ba === null && bb === null) return a < b ? -1 : 1;
        if (ba === null) return 1;
        if (bb === null) return -1;
        return ba - bb || (a < b ? -1 : 1);
      });
      arr.forEach(function (id, i) { order[id] = arr.length > 1 ? i / (arr.length - 1) : 0.5; });
    });

    var positions = {};
    var x = 0;
    levels.forEach(function (L) {
      var arr = byLevel[L];
      var cols = Math.ceil(arr.length / MAX_PER_COL);
      var rows = Math.ceil(arr.length / cols);
      arr.forEach(function (id, i) {
        var col = i % cols, row = Math.floor(i / cols);
        positions[id] = { x: x + col * SUBCOL_SEP, y: (row - (rows - 1) / 2) * NODE_SPACING };
      });
      x += (cols - 1) * SUBCOL_SEP + LEVEL_SEP;
    });
    return positions;
  }

  // Cycles drawn as rings, in import order - laid out in layers a cycle
  // degenerates into a long line with one edge jumping back across the
  // whole screen. Cycles that share files are merged into a single ring:
  // each additional cycle's members are spliced in right after the file it
  // shares with the ring, so e.g. a "user.entity <-> user-comment.entity"
  // pair ends up as two neighbors on the ring instead of an edge across
  // it. Separate groups get separate rings, tiled in a grid.
  function cycleRingsLayout(cycles) {
    var members = cycles.map(function (c) { return c.slice(0, -1); });

    var parent = members.map(function (_, i) { return i; });
    function find(i) { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }
    var firstCycleOf = {};
    members.forEach(function (m, i) {
      m.forEach(function (id) {
        if (firstCycleOf[id] === undefined) firstCycleOf[id] = i;
        else parent[find(i)] = find(firstCycleOf[id]);
      });
    });
    var groups = {};
    members.forEach(function (_, i) { (groups[find(i)] = groups[find(i)] || []).push(i); });

    var rings = Object.keys(groups).map(function (key) {
      var pending = groups[key].slice();
      var order = members[pending.shift()].slice();
      var placed = {};
      order.forEach(function (id) { placed[id] = true; });
      while (pending.length) {
        for (var p = 0; p < pending.length; p++) {
          var cyc = members[pending[p]];
          var at = -1, shared = -1;
          for (var k = 0; k < cyc.length && at === -1; k++) {
            if (placed[cyc[k]]) { at = order.indexOf(cyc[k]); shared = k; }
          }
          if (at === -1) continue;
          var insert = [];
          for (var step = 1; step < cyc.length; step++) {
            var id = cyc[(shared + step) % cyc.length];
            if (!placed[id]) { placed[id] = true; insert.push(id); }
          }
          order.splice.apply(order, [at + 1, 0].concat(insert));
          pending.splice(p, 1);
          break;
        }
      }
      return { order: order, radius: Math.max(90, order.length * 140 / (2 * Math.PI)) };
    });

    var positions = {};
    var cols = Math.ceil(Math.sqrt(rings.length));
    var cell = 0;
    rings.forEach(function (r) { cell = Math.max(cell, r.radius * 2 + 160); });
    rings.forEach(function (ring, i) {
      var cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell;
      ring.order.forEach(function (id, j) {
        var angle = -Math.PI / 2 + (2 * Math.PI * j) / ring.order.length;
        positions[id] = { x: cx + ring.radius * Math.cos(angle), y: cy + ring.radius * Math.sin(angle) };
      });
    });
    return positions;
  }

  function computeVisibleSet(graph, state, adjacency, layout) {
    var visible = {};

    if (state.focus) {
      state.focus.ids.forEach(function (id) { visible[id] = true; });
      if (state.focus.withNeighbors) {
        state.focus.ids.forEach(function (id) {
          (adjacency.childrenOf[id] || []).concat(adjacency.parentsOf[id] || []).forEach(function (n) { visible[n] = true; });
        });
      }
      return visible;
    }

    if (state.showEverything) {
      graph.nodes.forEach(function (n) {
        if (n.isIsolated) return; // listed separately in the sidebar
        if (state.showExternal || !n.external) visible[n.id] = true;
      });
      return visible;
    }

    var entries = graph.nodes.filter(function (n) { return n.isEntry; });
    if (entries.length === 0) {
      // degenerate case (e.g. pure cycle, no clear root) - fall back to showing everything
      graph.nodes.forEach(function (n) {
        if (!n.external) visible[n.id] = true;
        if (!n.external) layout.place(n.id, null, "forward");
      });
      return visible;
    }

    entries.forEach(function (n) {
      visible[n.id] = true;
      layout.place(n.id, null, "forward");
    });
    state.expandedForward.forEach(function (id) {
      (adjacency.childrenOf[id] || []).forEach(function (c) {
        visible[c] = true;
        layout.place(c, id, "forward");
      });
    });
    state.expandedBackward.forEach(function (id) {
      (adjacency.parentsOf[id] || []).forEach(function (p) {
        visible[p] = true;
        layout.place(p, id, "backward");
      });
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
    if (state.showEverything || state.focus) return "";
    var parts = [];
    var hasMoreDown = (adjacency.childrenOf[n.id] || []).length > 0 && !state.expandedForward.has(n.id);
    var hasMoreUp = (adjacency.parentsOf[n.id] || []).length > 0 && !state.expandedBackward.has(n.id);
    if (hasMoreDown) parts.push("▸" + n.descendantCount + "·d" + n.maxDepthDown);
    if (hasMoreUp) parts.push("◂" + n.ancestorCount + "·d" + n.maxDepthUp);
    return parts.join("  ");
  }

  function buildFileVisData(graph, state, adjacency, layout) {
    var visibleSet = computeVisibleSet(graph, state, adjacency, layout);
    var visibleNodes = graph.nodes.filter(function (n) {
      if (!visibleSet[n.id]) return false;
      if (state.onlyAffected) return n.changed || n.impacted;
      return true;
    });
    var visibleIds = {};
    visibleNodes.forEach(function (n) { visibleIds[n.id] = true; });
    var visibleEdges = graph.edges.filter(function (e) { return visibleIds[e.from] && visibleIds[e.to]; });

    var staticPositions = null;
    if (state.focus && state.focus.cycles) staticPositions = cycleRingsLayout(state.focus.cycles);
    else if (state.focus || state.showEverything) staticPositions = layeredLayout(Object.keys(visibleIds), visibleEdges);
    var focusIds = {};
    if (state.focus) state.focus.ids.forEach(function (id) { focusIds[id] = true; });
    var focusEdges = state.focus && state.focus.edgePairs ? state.focus.edgePairs : {};
    // hundreds of curved edges are both slow to draw and harder to follow
    // than straight ones
    var edgeSmooth = visibleEdges.length > 300 ? false : { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.4 };

    var nodes = visibleNodes.map(function (n) {
      var fill = n.parseError ? COLORS.parseError
        : n.unresolved ? COLORS.unresolved
        : n.crossProjectInterface ? COLORS.crossProjectInterface
        : n.external ? COLORS.external
        : n.isEntry ? COLORS.entry
        : COLORS.internal;
      var borderColor = n.changed ? BORDER.changed : n.impacted ? BORDER.impacted : fill;
      var borderWidth = n.changed ? 4 : n.impacted ? 3 : 1;
      if (focusIds[n.id]) {
        borderColor = FOCUS_COLOR;
        borderWidth = 4;
      }
      var badge = badgeFor(n, state, adjacency);
      var baseLabel = n.label.split("/").pop();
      var pos = staticPositions ? staticPositions[n.id] : layout.get(n.id);

      var nodeObj = {
        id: n.id,
        label: badge ? baseLabel + "\\n" + badge : baseLabel,
        title: nodeTitle(n),
        color: { background: fill, border: borderColor },
        borderWidth: borderWidth,
        shape: n.external || n.crossProjectInterface ? "box" : "ellipse",
        font: { color: "#1b1f24", multi: false }
      };
      // in a focus view, the neighbors pulled in for context are dimmed so
      // the focused nodes themselves stand out
      if (state.focus && !focusIds[n.id]) nodeObj.opacity = 0.45;
      if (pos) {
        nodeObj.x = pos.x;
        nodeObj.y = pos.y;
        nodeObj.fixed = { x: true, y: true };
      }
      return nodeObj;
    });

    var edges = visibleEdges.map(function (e, i) {
      var baseColor = e.kind.indexOf("type") !== -1 ? "#c2c7d0" : "#8a8f98";
      var emphasized = focusEdges[e.from + "->" + e.to];
      return {
        id: i,
        from: e.from,
        to: e.to,
        arrows: "to",
        title: e.kind + (e.crossProject ? " [cross-project]" : "") + (e.names && e.names.length ? ": " + e.names.join(", ") : ""),
        color: emphasized
          ? { color: COLORS.unresolved, opacity: 1 }
          : { color: e.crossProject ? "#7c3aed" : baseColor, opacity: e.crossProject ? 0.9 : 0.6 },
        width: emphasized ? 3 : e.crossProject ? 2 : 1,
        dashes: e.kind === "dynamic-import",
        smooth: edgeSmooth
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
  // Each stat that corresponds to something drawable is a link: clicking it
  // focuses the graph on exactly those nodes (see focusFromStat).
  function statLine(key, count, text, style) {
    var attrs = key ? " class='stat-link' data-focus='" + key + "' title='Show on the graph'" : "";
    return "<div" + attrs + (style ? " style='" + style + "'" : "") + "><b>" + count + "</b> " + text + "</div>";
  }

  function renderStats(graph) {
    var s = graph.stats;
    var html = "";
    html += statLine("all", s.fileCount, "files");
    html += statLine("all", s.edgeCount, "dependency edges");
    html += statLine(s.externalCount ? "external" : null, s.externalCount, "external packages");
    if (s.builtinSkippedCount) {
      html += statLine(null, s.builtinSkippedCount, "Node builtin imports (excluded)");
    }
    if (s.isolatedCount) {
      html += statLine("isolated", s.isolatedCount, "isolated file(s) (no imports, not imported)");
    }
    html += statLine(s.cycleCount ? "cycles" : null, s.cycleCount, "circular dependency chain(s)");
    if (s.parseErrorCount) {
      html += statLine("parse", s.parseErrorCount, "parse error(s)", "color:" + COLORS.parseError);
    }
    if (s.projects && s.projects.length > 1) {
      html += statLine("projects", s.projects.length, "sub-projects detected");
    }
    if (s.interfaceGraph && s.interfaceGraph.edges.length) {
      html += statLine("interfaces", s.interfaceGraph.edges.length, "interface/implements link(s)");
    }
    if (s.diff) {
      if (s.diff.error) {
        html += "<div style='color:" + COLORS.parseError + "'>diff: " + escapeHtml(s.diff.error) + "</div>";
      } else {
        html += "<div class='stat-link' data-focus='diff' title='Show on the graph' style='margin-top:6px;padding-top:6px;border-top:1px dashed #e1e4e8'>";
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
      s.cycles.slice(0, 50).forEach(function (cycle, i) {
        html += "<li class='stat-link' data-cycle='" + i + "' title='Show this cycle on the graph' style='font-size:12px'>" + cycle.map(escapeHtml).join(" &rarr; ") + "</li>";
      });
      html += "</ul></details>";
    }
    html += "<div style='font-size:11px;color:#888;margin-top:6px'>Click a line to show it on the graph.</div>";
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
      expandedBackward: new Set(),
      // { title, ids, withNeighbors, edgePairs } - when set, the file graph
      // shows exactly these nodes (e.g. one cycle) instead of the normal view
      focus: null
    };

    document.getElementById("only-affected-wrap").style.display = hasDiff ? "block" : "none";
    document.getElementById("mode-project").style.display = hasProjects ? "inline-block" : "none";
    document.getElementById("mode-interfaces").style.display = hasInterfaces ? "inline-block" : "none";
    document.getElementById("legend-crossproject").style.display = hasProjects ? "block" : "none";
    document.getElementById("legend-diff").style.display = hasDiff ? "block" : "none";
    document.getElementById("legend-interfaces").style.display = hasInterfaces ? "block" : "none";

    document.getElementById("stats").innerHTML = renderStats(graph);
    renderIsolatedList(graph);

    var layout = makeLayoutPlanner();

    function currentData() {
      if (state.mode === "project") return buildProjectVisData(graph);
      if (state.mode === "interfaces") return buildInterfaceVisData(graph);
      return buildFileVisData(graph, state, adjacency, layout);
    }

    function networkOptionsFor(mode) {
      if (mode === "file") {
        // Every file-graph node gets an explicit (x, y) - from the layout
        // planner while expanding step by step, or from layeredLayout for
        // "show everything" / focus views - so vis never lays anything out
        // (or jitters) on its own here.
        return {
          layout: { hierarchical: false },
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

    function freezeOnceStable(fit) {
      network.once("stabilizationIterationsDone", function () {
        network.setOptions({ physics: false });
        if (fit) {
          network.fit({ animation: { duration: 300, easingFunction: "easeInOutQuad" } });
        }
      });
    }

    function recreateNetwork(fit) {
      if (network) network.destroy();
      network = new vis.Network(container, { nodes: nodesDS, edges: edgesDS }, networkOptionsFor(state.mode, state));
      freezeOnceStable(fit !== false);
      wireSelectionEvents();
    }

    // 'fit': whether the camera is allowed to pan/zoom to show the new
    // data. Pass false for an incremental expand/collapse of a single node
    // (the whole point of the fixed layout is that nothing else should jump
    // around, including the camera) - true for anything that changes most
    // of what's on screen anyway (toggling a filter, switching views, reset).
    function refreshView(recreate, fit) {
      if (fit === undefined) fit = true;
      var d = currentData();
      network.setOptions({ physics: networkOptionsFor(state.mode, state).physics });
      nodesDS.clear(); nodesDS.add(d.nodes);
      edgesDS.clear(); edgesDS.add(d.edges);
      clearDetail();
      if (recreate) {
        recreateNetwork(fit);
      } else {
        freezeOnceStable(fit);
        if (fit) {
          // stabilizationIterationsDone doesn't reliably fire for small/instant
          // layouts, so also fit immediately rather than relying on it alone.
          network.fit({ animation: { duration: 300, easingFunction: "easeInOutQuad" } });
        }
      }
    }

    function setMode(mode) {
      state.mode = mode;
      ["mode-file", "mode-project", "mode-interfaces"].forEach(function (btnId) {
        document.getElementById(btnId).classList.toggle("active", btnId === "mode-" + mode);
      });
      document.getElementById("file-controls").style.display = mode === "file" ? "block" : "none";
      document.getElementById("isolated-wrap").style.display = mode === "file" && graph.nodes.some(function (n) { return n.isIsolated; }) ? "block" : "none";
      refreshView(true, true);
    }

    function setFocus(focus) {
      state.focus = focus;
      var banner = document.getElementById("focus-banner");
      if (focus) {
        banner.style.display = "block";
        document.getElementById("focus-title").textContent = focus.title + " — " + focus.ids.length + " node(s)";
      } else {
        banner.style.display = "none";
      }
    }

    function edgePairsOfCycles(cycles) {
      var pairs = {};
      cycles.forEach(function (cycle) {
        for (var i = 0; i < cycle.length - 1; i++) pairs[cycle[i] + "->" + cycle[i + 1]] = true;
      });
      return pairs;
    }

    function uniqueIdsOfCycles(cycles) {
      var seen = {};
      cycles.forEach(function (cycle) { cycle.forEach(function (id) { seen[id] = true; }); });
      return Object.keys(seen);
    }

    function idsWhere(pred) {
      return graph.nodes.filter(pred).map(function (n) { return n.id; });
    }

    // Turns a clicked stats line into "show exactly that on the graph".
    function focusFromStat(key, cycleIndex) {
      var s = graph.stats;
      if (key === "interfaces") { setFocus(null); setMode("interfaces"); return; }
      if (key === "projects") { setFocus(null); setMode("project"); return; }
      if (key === "all") {
        setFocus(null);
        state.showEverything = true;
        document.getElementById("show-everything").checked = true;
        setMode("file");
        return;
      }

      var focus = null;
      if (cycleIndex !== null) {
        var cycle = s.cycles[cycleIndex];
        focus = { title: "Cycle #" + (cycleIndex + 1), ids: uniqueIdsOfCycles([cycle]), edgePairs: edgePairsOfCycles([cycle]), cycles: [cycle] };
      } else if (key === "cycles") {
        focus = { title: "All circular dependencies", ids: uniqueIdsOfCycles(s.cycles), edgePairs: edgePairsOfCycles(s.cycles), cycles: s.cycles };
      } else if (key === "external") {
        focus = { title: "External packages (+ files using them)", ids: idsWhere(function (n) { return n.external; }), withNeighbors: true };
      } else if (key === "isolated") {
        focus = { title: "Isolated files", ids: idsWhere(function (n) { return n.isIsolated; }) };
      } else if (key === "parse") {
        focus = { title: "Files with parse errors", ids: idsWhere(function (n) { return !!n.parseError; }), withNeighbors: true };
      } else if (key === "diff") {
        focus = { title: "Changed + impacted files", ids: idsWhere(function (n) { return n.changed || n.impacted; }) };
      }
      if (!focus || !focus.ids.length) return;
      setFocus(focus);
      if (state.mode !== "file") setMode("file");
      else refreshView(true, true);
    }

    document.getElementById("stats").addEventListener("click", function (e) {
      var el = e.target.closest("[data-focus],[data-cycle]");
      if (!el) return;
      var cycleAttr = el.getAttribute("data-cycle");
      focusFromStat(el.getAttribute("data-focus"), cycleAttr === null ? null : Number(cycleAttr));
    });

    document.getElementById("clear-focus").addEventListener("click", function () {
      setFocus(null);
      refreshView(true, true);
    });

    document.getElementById("mode-file").addEventListener("click", function () { setFocus(null); setMode("file"); });
    document.getElementById("mode-project").addEventListener("click", function () { setFocus(null); setMode("project"); });
    document.getElementById("mode-interfaces").addEventListener("click", function () { setFocus(null); setMode("interfaces"); });

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
      setFocus(null);
      layout.reset();
      refreshView(true, true);
    });
    document.getElementById("reset-view").addEventListener("click", function () {
      setFocus(null);
      state.expandedForward = new Set();
      state.expandedBackward = new Set();
      state.showEverything = false;
      document.getElementById("show-everything").checked = false;
      layout.reset();
      refreshView(true, true);
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

      if (!state.showEverything && !state.focus) {
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

    // This node's own tree within what's currently visible: everything it
    // (transitively) imports, plus everything that (transitively) imports
    // it. Walked as two separate directed passes - an undirected walk would
    // leak through shared dependencies into unrelated branches and, on a
    // dense "show everything" graph, light up practically every node.
    function reachableWithinVisible(id, visibleIdsSet) {
      var result = {};
      result[id] = true;
      [adjacency.childrenOf, adjacency.parentsOf].forEach(function (next) {
        var seen = {};
        seen[id] = true;
        var queue = [id];
        while (queue.length) {
          var current = queue.shift();
          var neighbors = next[current] || [];
          for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            if (visibleIdsSet[n] && !seen[n]) {
              seen[n] = true;
              result[n] = true;
              queue.push(n);
            }
          }
        }
      });
      return result;
    }

    function baseOpacity(nid) {
      if (state.mode === "file" && state.focus && state.focus.ids.indexOf(nid) === -1) return 0.45;
      return 1;
    }

    function highlightNode(id) {
      var all = nodesDS.getIds();
      var keep;
      if (state.mode === "file") {
        var visibleIdsSet = {};
        all.forEach(function (nid) { visibleIdsSet[nid] = true; });
        keep = reachableWithinVisible(id, visibleIdsSet);
      } else {
        var connected = network.getConnectedNodes(id);
        keep = {};
        keep[id] = true;
        connected.forEach(function (nid) { keep[nid] = true; });
      }
      nodesDS.update(all.map(function (nid) {
        return { id: nid, opacity: keep[nid] ? 1 : 0.15 };
      }));
    }

    function showDetailFor(id) {
      var panel = document.getElementById("detail");
      if (state.mode === "project") { panel.innerHTML = renderProjectDetail(id); return; }
      if (state.mode === "interfaces") { panel.innerHTML = renderInterfaceDetail(id); return; }

      panel.innerHTML = renderFileDetail(id);
      var fwdBtn = document.getElementById("exp-fwd");
      if (fwdBtn) fwdBtn.addEventListener("click", function () { toggleExpand(id, "forward"); });
      var bwdBtn = document.getElementById("exp-bwd");
      if (bwdBtn) bwdBtn.addEventListener("click", function () { toggleExpand(id, "backward"); });
    }

    // Expands/collapses one node's direct neighbors in the given direction,
    // without moving the camera or anything already on screen - the newly
    // revealed nodes just appear as a branch next to 'id' (see
    // makeLayoutPlanner). Re-selects 'id' afterwards (refreshing the
    // dataset drops vis's internal selection) so the detail panel and the
    // "this subtree belongs to this node" highlight stay in sync.
    function toggleExpand(id, direction) {
      var set = direction === "backward" ? state.expandedBackward : state.expandedForward;
      if (set.has(id)) set.delete(id); else set.add(id);
      refreshView(false, false);
      network.selectNodes([id]);
      highlightNode(id);
      showDetailFor(id);
    }

    function wireSelectionEvents() {
      network.on("selectNode", function (params) {
        var id = params.nodes[0];
        highlightNode(id);
        showDetailFor(id);
      });

      network.on("deselectNode", function () {
        var all = nodesDS.getIds();
        nodesDS.update(all.map(function (nid) { return { id: nid, opacity: baseOpacity(nid) }; }));
        clearDetail();
      });

      network.on("doubleClick", function (params) {
        if (state.mode !== "file" || state.showEverything || state.focus) return;
        var id = params.nodes[0];
        if (!id) return;
        var hasMoreDown = (adjacency.childrenOf[id] || []).length > 0;
        var hasMoreUp = (adjacency.parentsOf[id] || []).length > 0;
        if (hasMoreDown) toggleExpand(id, "forward");
        else if (hasMoreUp) toggleExpand(id, "backward");
      });
    }

    recreateNetwork(true);
    refreshView(false, true);

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
            setFocus(null);
            layout.reset();
            refreshView(false, true);
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
