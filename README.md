# jsRefactoringToolExperiments

AST-based tooling experiments for JS/TS codebases.

- **[`module-graph/`](module-graph/README.md)** — builds a module
  dependency graph from a project's AST (CommonJS `require`, ES
  `import`/`export`, dynamic `import()`, TypeScript) and renders it as an
  interactive, explorable graph. This is the active tool — start here.
- **`legacy/`** — earlier scratch experiments for an AST-based code
  mutation VS Code extension (unrelated proof-of-concept scripts, kept for
  history, not maintained).

## Quick start

```bash
npm install
node module-graph/cli.js ./path/to/project --out report.html
```

See [`module-graph/README.md`](module-graph/README.md) for all options.
