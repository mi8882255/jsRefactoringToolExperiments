const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");

const BASE_PLUGINS = [
  "jsx",
  "classProperties",
  "classPrivateProperties",
  "classPrivateMethods",
  "objectRestSpread",
  "optionalChaining",
  "nullishCoalescingOperator",
  "dynamicImport",
  "importMeta",
  "topLevelAwait",
  "exportDefaultFrom",
  "decorators-legacy",
];

function pluginsFor(ext) {
  const plugins = [...BASE_PLUGINS];
  if (ext === ".ts" || ext === ".tsx") {
    plugins.push("typescript");
    // typescript plugin owns JSX disambiguation for .tsx, so drop the
    // generic "jsx" entry to avoid parser conflicts on .ts files with
    // generics like `foo<T>(x)`.
    const jsxIndex = plugins.indexOf("jsx");
    if (ext === ".ts" && jsxIndex !== -1) plugins.splice(jsxIndex, 1);
  } else if (ext === ".jsx") {
    plugins.push("flow");
  }
  return plugins;
}

/**
 * Reads and parses a single source file into a Babel AST.
 * Returns { ast, code, ext } on success, or { error } on failure.
 */
function parseFile(filePath) {
  const ext = path.extname(filePath);
  const code = fs.readFileSync(filePath, "utf8");

  try {
    const ast = parse(code, {
      sourceType: "unambiguous",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: pluginsFor(ext),
    });
    return { ast, code, ext };
  } catch (error) {
    return { error: error.message, code, ext };
  }
}

module.exports = { parseFile };
