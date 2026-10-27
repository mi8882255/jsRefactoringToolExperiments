const express = require("express");
const path = require("path");
const { buildGraph } = require("./buildGraph");
const { renderServerHtml } = require("./renderHtml");

function startServer({ targetDir, port, includeExternal }) {
  const app = express();

  app.get("/", (req, res) => {
    res.send(renderServerHtml({ title: path.basename(targetDir) }));
  });

  app.get("/api/graph", (req, res) => {
    try {
      const graph = buildGraph(targetDir, { includeExternal });
      res.json(graph);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(port, () => {
    console.log(`Module graph viewer running at http://localhost:${port}`);
    console.log(`Watching: ${targetDir}`);
  });
}

module.exports = { startServer };
