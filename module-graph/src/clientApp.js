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
    var childrenOf = {}, parentsOf = {}, seen = {};
    graph.edges.forEach(function (e) {
      // the same pair can appear twice (e.g. "import" + "import type")
      var key = e.from + "->" + e.to;
      if (seen[key]) return;
      seen[key] = true;
      (childrenOf[e.from] = childrenOf[e.from] || []).push(e.to);
      (parentsOf[e.to] = parentsOf[e.to] || []).push(e.from);
    });
    return { childrenOf: childrenOf, parentsOf: parentsOf };
  }

  function isTestFile(id) {
    return /(^|\\/)(__tests__|tests?|e2e)\\//.test(id) || /\\.(spec|test|e2e-spec)\\.[cm]?[jt]sx?$/.test(id);
  }

  // The file graph actually drawn: the raw graph minus whatever the sidebar
  // filters hide. Roles are recomputed for what's left - e.g. with tests
  // hidden, a service that was only imported by its spec becomes an entry
  // point - and per-node reach (the "N files, depth D" numbers) is computed
  // lazily, only for nodes that are actually shown or clicked.
  function buildFilteredView(graph, filters) {
    var keep = {};
    var nodes = [];
    graph.nodes.forEach(function (n) {
      if (!filters.showExternal && n.external) return;
      if (filters.hideTests && isTestFile(n.id)) return;
      if (filters.pattern && filters.pattern.test(n.id)) return;
      keep[n.id] = true;
      nodes.push(Object.assign({}, n));
    });
    var edges = graph.edges.filter(function (e) {
      if (!keep[e.from] || !keep[e.to]) return false;
      if (filters.hideTypeOnly && e.kind.indexOf("type") !== -1) return false;
      return true;
    });

    var view = { nodes: nodes, edges: edges, byId: {}, stats: graph.stats };
    nodes.forEach(function (n) { view.byId[n.id] = n; });
    view.adjacency = buildAdjacency(view);

    nodes.forEach(function (n) {
      var inc = (view.adjacency.parentsOf[n.id] || []).length;
      var out = (view.adjacency.childrenOf[n.id] || []).length;
      n.isEntry = !n.external && inc === 0 && out > 0;
      n.isLeaf = out === 0 && inc > 0;
      n.isIsolated = inc === 0 && out === 0;
    });

    var cache = {};
    function bfs(start, next) {
      var seen = {};
      seen[start] = true;
      var queue = [[start, 0]], count = 0, depth = 0;
      for (var qi = 0; qi < queue.length; qi++) {
        var cur = queue[qi];
        (next[cur[0]] || []).forEach(function (n) {
          if (!seen[n]) { seen[n] = true; count++; depth = Math.max(depth, cur[1] + 1); queue.push([n, cur[1] + 1]); }
        });
      }
      return { count: count, depth: depth };
    }
    view.metrics = function (id) {
      if (!cache[id]) {
        var down = bfs(id, view.adjacency.childrenOf);
        var up = bfs(id, view.adjacency.parentsOf);
        cache[id] = { down: down.count, depthDown: down.depth, up: up.count, depthUp: up.depth };
      }
      return cache[id];
    };
    return view;
  }

  // ---------------------------------------------------------------------
  // Group by folder: files collapsed into one node per folder (first N
  // directory levels), edges aggregated with counts. Double-clicking a
  // folder opens it into its files in place.
  // ---------------------------------------------------------------------
  function groupKeyOf(node, depth) {
    if (!node || node.external || node.unresolved || node.crossProjectInterface) return null;
    var dirs = node.id.split("/");
    dirs.pop();
    if (!dirs.length) return null; // files at the root stay individual
    return dirs.slice(0, depth).join("/") + "/";
  }

  function buildGroupGraph(view, depth, expandedGroups) {
    var displayOf = {};
    var groups = {};
    view.nodes.forEach(function (n) {
      if (n.isIsolated) return;
      var key = groupKeyOf(n, depth);
      if (key && !expandedGroups.has(key)) {
        displayOf[n.id] = "group:" + key;
        (groups[key] = groups[key] || []).push(n.id);
      } else {
        displayOf[n.id] = n.id;
      }
    });
    var edgeCounts = {};
    view.edges.forEach(function (e) {
      var a = displayOf[e.from], b = displayOf[e.to];
      if (!a || !b || a === b) return;
      var k = a + "->" + b;
      edgeCounts[k] = (edgeCounts[k] || 0) + 1;
    });
    var edges = Object.keys(edgeCounts).map(function (k) {
      var parts = k.split("->");
      return { from: parts[0], to: parts[1], count: edgeCounts[k] };
    });
    var nodeIds = {};
    Object.keys(displayOf).forEach(function (id) { nodeIds[displayOf[id]] = true; });
    return { displayOf: displayOf, groups: groups, nodeIds: Object.keys(nodeIds), edges: edges };
  }

  // two-line box label: bold file name, folder underneath in small grey
  function boxLabel(name, sub, badge) {
    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    var label = "<b>" + esc(name) + "</b>";
    if (sub) label += "\\n<i>" + esc(sub) + "</i>";
    if (badge) label += "\\n<code>" + esc(badge) + "</code>";
    return label;
  }

  var BOX_FONT = {
    multi: "html",
    size: 11,
    color: "#1b1f24",
    bold: { size: 11, color: "#1b1f24" },
    ital: { size: 9, color: "#5b6270" },
    mono: { size: 9, color: "#3b4250" }
  };

  function dirOf(id) {
    var i = id.lastIndexOf("/");
    if (i === -1) return "";
    var dir = id.slice(0, i);
    return dir.length > 34 ? "…" + dir.slice(dir.length - 33) : dir;
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
    var LEVEL_SEP = 260, NODE_SPACING = 60;
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
    var LEVEL_SEP = 320, SUBCOL_SEP = 240, NODE_SPACING = 54, MAX_PER_COL = 30;
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
      return { order: order, radius: Math.max(90, order.length * 210 / (2 * Math.PI)) };
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
        visible[n.id] = true;
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

  function badgeFor(n, state, view) {
    if (state.showEverything || state.focus) return "";
    var adjacency = view.adjacency;
    var parts = [];
    var hasMoreDown = (adjacency.childrenOf[n.id] || []).length > 0 && !state.expandedForward.has(n.id);
    var hasMoreUp = (adjacency.parentsOf[n.id] || []).length > 0 && !state.expandedBackward.has(n.id);
    if (!hasMoreDown && !hasMoreUp) return "";
    var m = view.metrics(n.id);
    if (hasMoreDown) parts.push("▸" + m.down + "·d" + m.depthDown);
    if (hasMoreUp) parts.push("◂" + m.up + "·d" + m.depthUp);
    return parts.join("  ");
  }

  // pale fill + colored border: readable dark text on every node type
  var BOX_STYLE = {
    internal: { background: "#e8f0fe", border: COLORS.internal },
    entry: { background: "#dcf5e7", border: COLORS.entry },
    external: { background: "#eef0f3", border: COLORS.external },
    unresolved: { background: "#fde8e8", border: COLORS.unresolved },
    parseError: { background: "#fff4e0", border: COLORS.parseError },
    crossProjectInterface: { background: "#f3e8ff", border: COLORS.crossProjectInterface },
    group: { background: "#f4f6fa", border: "#64748b" }
  };

  var THIN_ARROW = { to: { enabled: true, scaleFactor: 0.45 } };

  function boxStyleOf(n) {
    return n.parseError ? BOX_STYLE.parseError
      : n.unresolved ? BOX_STYLE.unresolved
      : n.crossProjectInterface ? BOX_STYLE.crossProjectInterface
      : n.external ? BOX_STYLE.external
      : n.isEntry ? BOX_STYLE.entry
      : BOX_STYLE.internal;
  }

  function fileNodeObject(n, opts) {
    var style = boxStyleOf(n);
    var borderColor = n.changed ? BORDER.changed : n.impacted ? BORDER.impacted : style.border;
    var borderWidth = n.changed ? 3 : n.impacted ? 2.5 : 1;
    if (opts.focused) { borderColor = FOCUS_COLOR; borderWidth = 3; }
    var name = n.external ? n.label : n.label.split("/").pop();
    var obj = {
      id: n.id,
      label: boxLabel(name, n.external ? "" : dirOf(n.id), opts.badge),
      title: nodeTitle(n),
      shape: "box",
      margin: { top: 4, bottom: 4, left: 6, right: 6 },
      widthConstraint: { maximum: 220 },
      color: { background: style.background, border: borderColor, highlight: { background: "#fff", border: FOCUS_COLOR } },
      borderWidth: borderWidth,
      font: BOX_FONT
    };
    if (opts.pos) {
      obj.x = opts.pos.x;
      obj.y = opts.pos.y;
      obj.fixed = { x: true, y: true };
    }
    return obj;
  }

  function fileEdgeObject(e, i, opts) {
    var baseColor = e.kind && e.kind.indexOf("type") !== -1 ? "#c2c7d0" : "#8a8f98";
    return {
      id: i,
      from: e.from,
      to: e.to,
      arrows: THIN_ARROW,
      title: (e.kind || "") + (e.crossProject ? " [cross-project]" : "") + (e.names && e.names.length ? ": " + e.names.join(", ") : ""),
      color: opts.emphasized
        ? { color: COLORS.unresolved, opacity: 1 }
        : { color: e.crossProject ? "#7c3aed" : baseColor, opacity: e.crossProject ? 0.9 : 0.55 },
      width: opts.emphasized ? 2 : e.crossProject ? 1.2 : 0.6,
      dashes: e.kind === "dynamic-import",
      smooth: opts.smooth
    };
  }

  function buildGroupedVisData(view, state, groupLayoutCache) {
    var collapsedKey = state.groupDepth + "|" + view.nodes.length + "|" + view.edges.length;
    if (groupLayoutCache.key !== collapsedKey) {
      // positions come from the fully collapsed folder graph, so opening a
      // folder never moves the other folders around
      var collapsed = buildGroupGraph(view, state.groupDepth, new Set());
      groupLayoutCache.key = collapsedKey;
      groupLayoutCache.positions = layeredLayout(collapsed.nodeIds, collapsed.edges);
    }
    var base = groupLayoutCache.positions;
    var g = buildGroupGraph(view, state.groupDepth, state.expandedGroups);

    // An opened folder's files go in a small grid starting where the folder
    // was, and only the nodes below it in the same column are pushed down to
    // make room - every other column stays exactly where it was.
    var work = {};
    Object.keys(base).forEach(function (id) { work[id] = { x: base[id].x, y: base[id].y }; });
    var positions = {};
    var opened = [];
    state.expandedGroups.forEach(function (key) { if (base["group:" + key]) opened.push(key); });
    opened.sort(function (a, b) { return base["group:" + a].y - base["group:" + b].y; });
    opened.forEach(function (key) {
      var anchor = work["group:" + key];
      var files = view.nodes.filter(function (n) { return !n.isIsolated && groupKeyOf(n, state.groupDepth) === key; });
      var cols = Math.max(1, Math.ceil(Math.sqrt(files.length / 4)));
      var rows = Math.ceil(files.length / cols);
      var ROW_H = 52, COL_W = 230;
      var extra = rows * ROW_H - ROW_H;
      var band = (cols * COL_W) / 2 + 120;
      Object.keys(work).forEach(function (id) {
        if (id === "group:" + key) return;
        if (Math.abs(work[id].x - anchor.x) < band && work[id].y > anchor.y + 1) work[id].y += extra;
      });
      files.forEach(function (n, i) {
        var col = i % cols, row = Math.floor(i / cols);
        positions[n.id] = { x: anchor.x + (col - (cols - 1) / 2) * COL_W, y: anchor.y + row * ROW_H };
      });
    });
    g.nodeIds.forEach(function (id) { if (!positions[id] && work[id]) positions[id] = work[id]; });

    var maxCount = 1;
    g.edges.forEach(function (e) { if (e.count > maxCount) maxCount = e.count; });
    var smooth = g.edges.length > 300 ? false : { type: "cubicBezier", forceDirection: "horizontal", roundness: 0.4 };

    var nodes = g.nodeIds.map(function (id) {
      if (id.indexOf("group:") === 0) {
        var key = id.slice(6);
        return {
          id: id,
          label: boxLabel(key, g.groups[key].length + " files", ""),
          title: key + "\\n" + g.groups[key].length + " files\\n(double-click to open)",
          shape: "box",
          margin: { top: 6, bottom: 6, left: 8, right: 8 },
          color: { background: BOX_STYLE.group.background, border: BOX_STYLE.group.border, highlight: { background: "#fff", border: FOCUS_COLOR } },
          borderWidth: 1.5,
          shapeProperties: { borderDashes: [4, 3] },
          font: BOX_FONT,
          x: positions[id].x, y: positions[id].y, fixed: { x: true, y: true }
        };
      }
      return fileNodeObject(view.byId[id], { pos: positions[id] });
    });
    var edges = g.edges.map(function (e, i) {
      return {
        id: i,
        from: e.from,
        to: e.to,
        arrows: THIN_ARROW,
        title: e.count + " import(s)",
        count: e.count,
        color: { color: "#8a8f98", opacity: 0.6 },
        width: 0.6 + 2.5 * Math.log(1 + e.count) / Math.log(1 + maxCount),
        smooth: smooth
      };
    });
    return { nodes: nodes, edges: edges };
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
      var nodeObj = fileNodeObject(n, {
        badge: badgeFor(n, state, graph),
        focused: !!focusIds[n.id],
        pos: staticPositions ? staticPositions[n.id] : layout.get(n.id)
      });
      // in a focus view, the neighbors pulled in for context are dimmed so
      // the focused nodes themselves stand out
      if (state.focus && !focusIds[n.id]) nodeObj.opacity = 0.45;
      return nodeObj;
    });

    var drawnPairs = {};
    var edges = [];
    visibleEdges.forEach(function (e) {
      var pair = e.from + "->" + e.to;
      if (drawnPairs[pair]) return; // "import" + "import type" of the same file -> one arrow
      drawnPairs[pair] = true;
      edges.push(fileEdgeObject(e, edges.length, { emphasized: focusEdges[pair], smooth: edgeSmooth }));
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
        arrows: THIN_ARROW,
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
        arrows: THIN_ARROW,
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
    var ifaceIndex = buildInterfaceIndex(graph.stats.interfaceGraph);

    var filters = { showExternal: true, hideTests: false, hideTypeOnly: false, pattern: null };
    var view = buildFilteredView(graph, filters);
    var adjacency = view.adjacency;
    var groupLayoutCache = {};

    function rebuildView() {
      view = buildFilteredView(graph, filters);
      adjacency = view.adjacency;
      groupLayoutCache = {};
      renderIsolatedList(view);
    }

    var state = {
      mode: "file",
      onlyAffected: false,
      showEverything: false,
      expandedForward: new Set(),
      expandedBackward: new Set(),
      groupDepth: 0,
      expandedGroups: new Set(),
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
    renderIsolatedList(view);

    var layout = makeLayoutPlanner();

    function inGroupMode() {
      return state.mode === "file" && state.groupDepth > 0 && !state.focus;
    }

    function currentData() {
      if (state.mode === "project") return buildProjectVisData(graph);
      if (state.mode === "interfaces") return buildInterfaceVisData(graph);
      if (inGroupMode()) return buildGroupedVisData(view, state, groupLayoutCache);
      return buildFileVisData(view, state, adjacency, layout);
    }

    function updateViewSummary() {
      var el = document.getElementById("view-summary");
      if (state.mode !== "file") { el.textContent = ""; return; }
      el.textContent = "On screen: " + nodesDS.length + " nodes, " + edgesDS.length + " edges";
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
      updateViewSummary();
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
      document.getElementById("isolated-wrap").style.display = mode === "file" && view.nodes.some(function (n) { return n.isIsolated; }) ? "block" : "none";
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
        focus = { title: "Isolated files", ids: view.nodes.filter(function (n) { return n.isIsolated; }).map(function (n) { return n.id; }) };
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

    function applyFilters() {
      rebuildView();
      layout.reset();
      refreshView(true, true);
    }

    document.getElementById("toggle-external").addEventListener("change", function (e) {
      filters.showExternal = e.target.checked;
      applyFilters();
    });
    document.getElementById("hide-tests").addEventListener("change", function (e) {
      filters.hideTests = e.target.checked;
      applyFilters();
    });
    document.getElementById("hide-type-only").addEventListener("change", function (e) {
      filters.hideTypeOnly = e.target.checked;
      applyFilters();
    });
    var patternTimer = null;
    document.getElementById("hide-pattern").addEventListener("input", function (e) {
      var input = e.target;
      clearTimeout(patternTimer);
      patternTimer = setTimeout(function () {
        var text = input.value.trim();
        input.classList.remove("invalid");
        if (!text) {
          filters.pattern = null;
        } else {
          try {
            filters.pattern = new RegExp(text, "i");
          } catch (err) {
            input.classList.add("invalid");
            return;
          }
        }
        applyFilters();
      }, 300);
    });
    document.getElementById("group-depth").addEventListener("change", function (e) {
      state.groupDepth = Number(e.target.value);
      state.expandedGroups = new Set();
      groupLayoutCache = {};
      setFocus(null);
      refreshView(true, true);
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

    // A clickable entry in a detail-panel list: clicking it navigates to
    // that node (see navigateTo). 'rel' says how it relates to the node the
    // panel is showing, so a not-yet-visible target can be revealed by
    // expanding in the right direction.
    function navItem(targetId, rel, text) {
      return "<li class='nav-link' data-nav='" + escapeHtml(targetId) + "' data-rel='" + rel + "' title='Go to this node'>" + (text || escapeHtml(targetId)) + "</li>";
    }

    function navList(items) {
      return "<ul class='nav-list'>" + items.join("") + "</ul>";
    }

    function renderFileDetail(id) {
      var node = view.byId[id];
      if (!node) return "";
      var hasMoreDown = (adjacency.childrenOf[id] || []).length > 0;
      var hasMoreUp = (adjacency.parentsOf[id] || []).length > 0;
      var flags = [];
      if (node.changed) flags.push("<span style='color:" + BORDER.changed + "'>changed</span>");
      if (node.impacted) flags.push("<span style='color:" + BORDER.impacted + "'>impacted</span>");
      if (node.project && graph.stats.projects && graph.stats.projects.length > 1) flags.push("project: " + escapeHtml(node.project));

      var html = "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(id) + "</h3>";
      if (flags.length) html += "<div style='font-size:12px;margin-bottom:6px'>" + flags.join(" &middot; ") + "</div>";

      if (inGroupMode()) {
        var key = groupKeyOf(node, state.groupDepth);
        if (key && state.expandedGroups.has(key)) {
          html += "<button class='detail-btn' id='collapse-group' data-group='" + escapeHtml(key) + "'>▴ Collapse folder " + escapeHtml(key) + "</button>";
        }
      } else if (!state.showEverything && !state.focus) {
        var m = view.metrics(id);
        if (hasMoreDown) {
          var fwdOn = state.expandedForward.has(id);
          html += "<button class='detail-btn' id='exp-fwd'>" + (fwdOn ? "▾ Hide dependencies" : "▸ Show dependencies (" + m.down + " files, depth " + m.depthDown + ")") + "</button>";
        }
        if (hasMoreUp) {
          var bwdOn = state.expandedBackward.has(id);
          html += "<button class='detail-btn' id='exp-bwd'>" + (bwdOn ? "▴ Hide importers" : "◂ Show who imports this (" + m.up + " files, depth " + m.depthUp + ")") + "</button>";
        }
      }

      // cross-link to the interface/DI graph, if this file declares or implements something
      var ifaceIds = ifaceIndex.byFile[id] || [];
      ifaceIds.forEach(function (ifaceId) {
        var ifaceNode = ifaceIndex.nodesById[ifaceId];
        if (ifaceNode.kind === "class") {
          var implementsEdges = ifaceIndex.outgoingFrom[ifaceId] || [];
          if (implementsEdges.length) {
            html += "<div class='detail-label'><b>" + escapeHtml(ifaceNode.label) + "</b> " + implementsEdges[0].relation + ":</div>";
            html += navList(implementsEdges.map(function (e) {
              var target = ifaceIndex.nodesById[e.to];
              if (!target.file) return "<li>" + escapeHtml(target.label) + " <i>(not in this scan)</i></li>";
              return navItem(target.file, "any", escapeHtml(target.label) + " <span class='muted'>" + escapeHtml(target.file) + "</span>");
            }));
          }
        } else {
          var implementedBy = ifaceIndex.incomingTo[ifaceId] || [];
          if (implementedBy.length) {
            html += "<div class='detail-label'><b>" + escapeHtml(ifaceNode.label) + "</b> realized by:</div>";
            html += navList(implementedBy.map(function (e) {
              var source = ifaceIndex.nodesById[e.from];
              return navItem(source.file, "any", escapeHtml(source.label) + " <span class='muted'>" + escapeHtml(source.file) + "</span>");
            }));
          }
        }
      });

      var parents = adjacency.parentsOf[id] || [];
      var children = adjacency.childrenOf[id] || [];
      html += "<div class='detail-label'>imported by (" + parents.length + "):</div>";
      html += navList(parents.map(function (x) { return navItem(x, "parent"); }));
      html += "<div class='detail-label'>imports (" + children.length + "):</div>";
      html += navList(children.map(function (x) { return navItem(x, "child"); }));
      return html;
    }

    function renderGroupDetail(groupId) {
      var key = groupId.slice(6);
      var files = view.nodes.filter(function (n) { return !n.isIsolated && groupKeyOf(n, state.groupDepth) === key; });
      var outCounts = {}, inCounts = {};
      edgesDS.forEach(function (e) {
        if (e.from === groupId) outCounts[e.to] = (outCounts[e.to] || 0) + (e.count || 1);
        if (e.to === groupId) inCounts[e.from] = (inCounts[e.from] || 0) + (e.count || 1);
      });
      function countList(counts, rel) {
        return navList(Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (id) {
          var label = id.indexOf("group:") === 0 ? id.slice(6) : id;
          return navItem(id, rel, escapeHtml(label) + " <span class='muted'>(" + counts[id] + ")</span>");
        }));
      }
      var html = "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(key) + "</h3>";
      html += "<div style='font-size:12px;margin-bottom:6px'>folder &middot; " + files.length + " files</div>";
      html += "<button class='detail-btn' id='open-group' data-group='" + escapeHtml(key) + "'>▾ Open folder (or double-click it)</button>";
      html += "<div class='detail-label'>used by (" + Object.keys(inCounts).length + "):</div>" + countList(inCounts, "parent");
      html += "<div class='detail-label'>depends on (" + Object.keys(outCounts).length + "):</div>" + countList(outCounts, "child");
      html += "<details><summary class='detail-label' style='cursor:pointer'>files (" + files.length + ")</summary>" +
        navList(files.map(function (n) { return navItem(n.id, "any", escapeHtml(n.id.slice(key.length))); })) + "</details>";
      return html;
    }

    function renderProjectDetail(id) {
      var pg = graph.stats.projectGraph;
      var dependsOn = pg.edges.filter(function (e) { return e.from === id; });
      var usedBy = pg.edges.filter(function (e) { return e.to === id; });
      return "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(id) + "</h3>" +
        "<div class='detail-label'>depends on:</div>" +
        navList(dependsOn.map(function (e) { return navItem(e.to, "any", escapeHtml(e.to) + " <span class='muted'>(" + e.count + ")</span>"); })) +
        "<div class='detail-label'>used by:</div>" +
        navList(usedBy.map(function (e) { return navItem(e.from, "any", escapeHtml(e.from) + " <span class='muted'>(" + e.count + ")</span>"); }));
    }

    function renderInterfaceDetail(id) {
      var node = ifaceIndex.nodesById[id];
      var html = "<h3 style='margin:0 0 6px;font-size:13px;word-break:break-all'>" + escapeHtml(node.label) + "</h3>";
      html += "<div style='font-size:12px;color:#666;margin-bottom:6px'>" + node.kind + (node.file ? " in " + escapeHtml(node.file) : " (not found in this scan)") + "</div>";
      var out = ifaceIndex.outgoingFrom[id] || [];
      var inc = ifaceIndex.incomingTo[id] || [];
      if (out.length) {
        html += "<div class='detail-label'>" + out[0].relation + ":</div>" +
          navList(out.map(function (e) { var t = ifaceIndex.nodesById[e.to]; return navItem(e.to, "any", escapeHtml(t.label)); }));
      }
      if (inc.length) {
        html += "<div class='detail-label'>realized by:</div>" +
          navList(inc.map(function (e) { var s = ifaceIndex.nodesById[e.from]; return navItem(e.from, "any", escapeHtml(s.label) + " <span class='muted'>" + escapeHtml(s.file) + "</span>"); }));
      }
      return html;
    }

    // This node's own tree within what's currently visible: everything it
    // (transitively) imports, plus everything that (transitively) imports
    // it. Walked as two separate directed passes - an undirected walk would
    // leak through shared dependencies into unrelated branches and, on a
    // dense "show everything" graph, light up practically every node.
    function reachableWithinVisible(id, visibleIdsSet) {
      // walk the edges actually drawn, so this also works for folder nodes
      var shown = { childrenOf: {}, parentsOf: {} };
      edgesDS.forEach(function (e) {
        (shown.childrenOf[e.from] = shown.childrenOf[e.from] || []).push(e.to);
        (shown.parentsOf[e.to] = shown.parentsOf[e.to] || []).push(e.from);
      });
      var result = {};
      result[id] = true;
      [shown.childrenOf, shown.parentsOf].forEach(function (next) {
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

      if (String(id).indexOf("group:") === 0) {
        panel.innerHTML = renderGroupDetail(id);
        document.getElementById("open-group").addEventListener("click", function () { toggleGroup(id.slice(6), null); });
        return;
      }
      panel.innerHTML = renderFileDetail(id);
      var fwdBtn = document.getElementById("exp-fwd");
      if (fwdBtn) fwdBtn.addEventListener("click", function () { toggleExpand(id, "forward"); });
      var bwdBtn = document.getElementById("exp-bwd");
      if (bwdBtn) bwdBtn.addEventListener("click", function () { toggleExpand(id, "backward"); });
      var collapseBtn = document.getElementById("collapse-group");
      if (collapseBtn) collapseBtn.addEventListener("click", function () { toggleGroup(collapseBtn.getAttribute("data-group"), null); });
    }

    function selectAndShow(id, center) {
      if (!nodesDS.get(id)) return false;
      network.selectNodes([id]);
      highlightNode(id);
      showDetailFor(id);
      if (center) {
        // pan only - keep whatever zoom level the user picked
        network.focus(id, { scale: network.getScale(), animation: { duration: 350, easingFunction: "easeInOutQuad" } });
      }
      return true;
    }

    // Opens/closes a folder in "group by folder" mode. Opening keeps every
    // other folder where it was; the folder's files appear in its place.
    function toggleGroup(key, selectAfter) {
      if (state.expandedGroups.has(key)) state.expandedGroups.delete(key); else state.expandedGroups.add(key);
      refreshView(false, false);
      var select = selectAfter || (state.expandedGroups.has(key) ? null : "group:" + key);
      if (select) selectAndShow(select, false);
    }

    // Clicking an entry in the detail panel's lists: get that node on
    // screen if it isn't (opening its folder, expanding the current node in
    // the matching direction, or - failing that - focusing on it with its
    // neighbors), then select it and pan to it.
    function navigateTo(target, rel, fromId) {
      if (state.mode !== "file") { selectAndShow(target, true); return; }
      var isGroup = target.indexOf("group:") === 0;
      if (!isGroup && !view.byId[target]) {
        flashMessage("That file is hidden by the current filters.");
        return;
      }
      if (nodesDS.get(target)) { selectAndShow(target, true); return; }

      if (inGroupMode() && !isGroup) {
        var key = groupKeyOf(view.byId[target], state.groupDepth);
        if (key && !state.expandedGroups.has(key)) {
          state.expandedGroups.add(key);
          refreshView(false, false);
        }
      } else if (!state.showEverything && !state.focus && fromId) {
        if (rel === "child") state.expandedForward.add(fromId);
        else if (rel === "parent") state.expandedBackward.add(fromId);
        refreshView(false, false);
      }

      if (!nodesDS.get(target)) {
        setFocus({ title: target.split("/").pop() + " and its neighbors", ids: [target], withNeighbors: true });
        refreshView(true, false);
      }
      selectAndShow(target, true);
    }

    var flashTimer = null;
    function flashMessage(text) {
      var el = document.getElementById("view-summary");
      el.textContent = text;
      el.classList.add("flash");
      clearTimeout(flashTimer);
      flashTimer = setTimeout(function () { el.classList.remove("flash"); updateViewSummary(); }, 2200);
    }

    document.getElementById("detail").addEventListener("click", function (e) {
      var el = e.target.closest("[data-nav]");
      if (!el) return;
      var selected = network.getSelectedNodes();
      navigateTo(el.getAttribute("data-nav"), el.getAttribute("data-rel"), selected[0]);
    });

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
        var id = params.nodes[0];
        if (!id || state.mode !== "file") return;
        if (inGroupMode()) {
          // double-click a folder to open it, a file inside an open folder to close it again
          if (id.indexOf("group:") === 0) { toggleGroup(id.slice(6), null); return; }
          var key = groupKeyOf(view.byId[id], state.groupDepth);
          if (key && state.expandedGroups.has(key)) toggleGroup(key, "group:" + key);
          return;
        }
        if (state.showEverything || state.focus) return;
        var hasMoreDown = (adjacency.childrenOf[id] || []).length > 0;
        var hasMoreUp = (adjacency.parentsOf[id] || []).length > 0;
        if (hasMoreDown) toggleExpand(id, "forward");
        else if (hasMoreUp) toggleExpand(id, "backward");
      });
    }

    recreateNetwork(true);
    refreshView(false, true);

    // exposed for debugging in devtools (and for automated UI tests)
    window.__moduleGraph = { state: state, getNetwork: function () { return network; }, getView: function () { return view; } };

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
            rebuildView();
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
            state.expandedGroups = new Set();
            refreshView(false, true);
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
