const express = require("express");
const path = require("path");
const { buildGraph } = require("./buildGraph");
const { renderServerHtml } = require("./renderHtml");

function startServer({ targetDir, port, includeExternal, enableProjects, diff, extraBuiltins, skipBuiltinFilter }) {
  const app = express();

  app.get("/", (req, res) => {
    res.send(renderServerHtml({ title: path.basename(targetDir) }));
  });

  app.get("/api/graph", (req, res) => {
    try {
      const graph = buildGraph(targetDir, { includeExternal, enableProjects, diff, extraBuiltins, skipBuiltinFilter });
      res.json(graph);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(port, () => {
    console.log(`Module graph viewer running at http://localhost:${port}`);
    console.log(`Watching: ${targetDir}`);
    if (diff !== undefined) console.log(`Diff mode: ${diff || "HEAD"} (re-evaluated on every Rescan)`);
  });
}

module.exports = { startServer };
