const { clientAppSource } = require("./clientApp");

const VIS_NETWORK_CDN = "https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.9/standalone/umd/vis-network.min.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function page({ title, bodyExtra, dataScript }) {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Module graph: ${safeTitle}</title>
<script src="${VIS_NETWORK_CDN}"></script>
<style>
  html, body { margin: 0; height: 100%; font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1b1f24; }
  #app { display: flex; height: 100vh; }
  #network { flex: 1 1 auto; background: #fafbfc; }
  #sidebar { width: 310px; flex: 0 0 310px; border-left: 1px solid #e1e4e8; padding: 12px; overflow-y: auto; box-sizing: border-box; }
  #sidebar h1 { font-size: 15px; margin: 0 0 10px; }
  #sidebar input[type="text"] { width: 100%; padding: 6px 8px; box-sizing: border-box; border: 1px solid #d0d5dd; border-radius: 6px; margin-bottom: 10px; }
  #stats { font-size: 13px; line-height: 1.6; border-bottom: 1px solid #e1e4e8; padding-bottom: 10px; margin-bottom: 10px; }
  #legend { font-size: 12px; margin-bottom: 10px; }
  #legend span { display: inline-block; width: 12px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  #detail { border-top: 1px solid #e1e4e8; padding-top: 10px; margin-top: 10px; }
  #rescan { margin-bottom: 10px; padding: 6px 10px; border-radius: 6px; border: 1px solid #d0d5dd; background: #fff; cursor: pointer; }
  label.toggle { font-size: 12px; display: block; margin-bottom: 10px; }
  #mode-switch { margin-bottom: 10px; }
  #mode-switch button { font-size: 12px; padding: 5px 10px; border: 1px solid #d0d5dd; background: #fff; cursor: pointer; border-left: none; }
  #mode-switch button:first-child { border-radius: 6px 0 0 6px; border-left: 1px solid #d0d5dd; }
  #mode-switch button:last-child { border-radius: 0 6px 6px 0; }
  #mode-switch button.active { background: #4f8ef7; color: #fff; border-color: #4f8ef7; }
  .detail-btn { display: block; width: 100%; font-size: 12px; text-align: left; padding: 6px 8px; margin-bottom: 6px; border-radius: 6px; border: 1px solid #d0d5dd; background: #f6f8fa; cursor: pointer; }
  .detail-btn:hover { background: #eef1f4; }
  #reset-view { font-size: 12px; padding: 5px 10px; border-radius: 6px; border: 1px solid #d0d5dd; background: #fff; cursor: pointer; margin-bottom: 10px; }
  #isolated-wrap { font-size: 12px; margin-bottom: 10px; }
  #isolated-wrap summary { cursor: pointer; }
  .stat-link { cursor: pointer; border-radius: 4px; padding: 0 4px; margin: 0 -4px; }
  .stat-link:hover { background: #f1ecfe; color: #6d28d9; }
  #focus-banner { background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 13px; }
  #focus-banner #focus-title { font-weight: 600; margin: 2px 0 6px; }
  #clear-focus { font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #c4b5fd; background: #fff; cursor: pointer; }
  #filters { border: 1px solid #e1e4e8; border-radius: 8px; padding: 6px 10px 2px; margin-bottom: 8px; }
  #filters summary { font-size: 12px; font-weight: 600; cursor: pointer; margin-bottom: 6px; }
  #filters label.toggle { margin-bottom: 6px; }
  #filters input[type="text"] { margin-bottom: 6px; font-size: 12px; }
  #filters input.invalid { border-color: #e5484d; background: #fff5f5; }
  #group-depth { font-size: 12px; margin-left: 4px; }
  #view-summary { font-size: 11px; color: #888; margin-bottom: 10px; min-height: 14px; transition: color .2s; }
  #view-summary.flash { color: #d7263d; }
  .detail-label { font-size: 12px; color: #666; margin-top: 8px; }
  .nav-list { font-size: 12px; margin: 2px 0 6px 0; padding: 0; list-style: none; }
  .nav-list li { padding: 2px 6px; border-radius: 4px; word-break: break-all; }
  .nav-link { cursor: pointer; color: #1d4ed8; }
  .nav-link:hover { background: #eef2ff; }
  .muted { color: #888; }
</style>
</head>
<body>
<div id="app">
  <div id="network"></div>
  <div id="sidebar">
    <h1>${safeTitle}</h1>
    ${bodyExtra || ""}
    <div id="mode-switch">
      <button id="mode-file" class="active">File graph</button><button id="mode-project" style="display:none">Project graph</button><button id="mode-interfaces" style="display:none">Interfaces</button>
    </div>
    <div id="focus-banner" style="display:none">
      <div style="font-size:11px;color:#6d28d9;text-transform:uppercase;letter-spacing:.04em">Focused on</div>
      <div id="focus-title"></div>
      <button id="clear-focus">Clear focus</button>
    </div>
    <div id="file-controls">
      <input id="search" type="text" placeholder="Filter by path..." />
      <label class="toggle" id="only-affected-wrap" style="display:none"><input id="only-affected" type="checkbox" /> Show only changed/impacted</label>
      <label class="toggle"><input id="show-everything" type="checkbox" /> Show everything (skip collapse)</label>
      <button id="reset-view">Reset to entry points</button>
      <details id="filters" open>
        <summary>Filters</summary>
        <label class="toggle"><input id="toggle-external" type="checkbox" checked /> Show external packages</label>
        <label class="toggle"><input id="hide-tests" type="checkbox" /> Hide tests (*.spec, *.test, tests/)</label>
        <label class="toggle"><input id="hide-type-only" type="checkbox" /> Hide type-only imports</label>
        <input id="hide-pattern" type="text" placeholder="Hide paths (regex): \\.dto\\.|migrations" />
        <label class="toggle">Group by folder:
          <select id="group-depth">
            <option value="0">off</option>
            <option value="1">1 level</option>
            <option value="2">2 levels</option>
            <option value="3">3 levels</option>
            <option value="4">4 levels</option>
          </select>
        </label>
      </details>
      <div id="view-summary"></div>
      <div id="isolated-wrap" style="display:none"><div id="isolated-list"></div></div>
    </div>
    <div id="legend">
      <div><span style="background:#22b36b"></span>entry point (nothing imports it)</div>
      <div><span style="background:#4f8ef7"></span>internal module</div>
      <div><span style="background:#a0a4ad"></span>external package</div>
      <div><span style="background:#e5484d"></span>unresolved import</div>
      <div><span style="background:#f5a524"></span>parse error</div>
      <div style="font-size:11px;color:#888;margin-top:4px">&#9656;N&middot;dD = N files / depth D hidden below &middot; &#9666;N&middot;dD = hidden above (importers)</div>
      <div id="legend-crossproject" style="display:none"><span style="background:#c77dff"></span>cross-project interface</div>
      <div id="legend-diff" style="display:none">
        <div><span style="background:#fff;border:3px solid #d7263d"></span>changed (in diff)</div>
        <div><span style="background:#fff;border:3px solid #f2a900"></span>impacted (imports a changed file)</div>
      </div>
      <div id="legend-interfaces" style="display:none">
        <div><span style="background:#eef2ff;border:2px solid #6366f1;border-radius:2px"></span>interface / abstract class</div>
        <div><span style="background:#ecfdf5;border:2px solid #10b981"></span>implementing class</div>
      </div>
    </div>
    <div id="stats"></div>
    <div id="detail"><div style="color:#888;font-size:12px">Click a node to see its connections.</div></div>
  </div>
</div>
${dataScript}
<script>${clientAppSource()}</script>
</body>
</html>`;
}

function renderStaticHtml(graph, { title = "project" } = {}) {
  // Escape "</" so a path or error message containing it (e.g. "</script>")
  // can't prematurely close the embedding <script> tag.
  const safeJson = JSON.stringify(graph).replace(/<\//g, "<\\/");
  return page({
    title,
    dataScript: `<script>window.__GRAPH_DATA__ = ${safeJson};</script>`,
  });
}

function renderServerHtml({ title = "project" } = {}) {
  return page({
    title,
    bodyExtra: `<button id="rescan">Rescan</button>`,
    dataScript: "",
  });
}

module.exports = { renderStaticHtml, renderServerHtml };
