const fs = require("fs");
const path = require("path");
const { builtinModules } = require("module");
const { matchProjectBySpecifier } = require("./projects");

const RESOLVE_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json"];
const INDEX_BASENAMES = RESOLVE_EXTENSIONS.map((ext) => `index${ext}`);
const BUILTIN_SET = new Set(builtinModules);

function isRelative(source) {
  return source.startsWith("./") || source.startsWith("../") || source === "." || source === "..";
}

function isBuiltin(source) {
  const name = source.startsWith("node:") ? source.slice(5) : source;
  return BUILTIN_SET.has(name);
}

function fileExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

/**
 * Tries `candidate`, `candidate.<ext>` and `candidate/index.<ext>` in turn.
 * Returns an absolute path if one of them is a real file, otherwise null.
 */
function resolveAsFileOrDir(candidate) {
  if (fileExists(candidate)) return candidate;

  for (const ext of RESOLVE_EXTENSIONS) {
    if (fileExists(candidate + ext)) return candidate + ext;
  }

  for (const indexFile of INDEX_BASENAMES) {
    const indexPath = path.join(candidate, indexFile);
    if (fileExists(indexPath)) return indexPath;
  }

  return null;
}

/**
 * Resolves an import/require specifier found inside `fromFile`.
 * Returns one of:
 *   { kind: "relative",     resolved: absPath|null, candidate: absPath, source }
 *   { kind: "builtin",      source }                                        -- Node core module, e.g. "fs"
 *   { kind: "cross-project", resolved: absPath|null, project, source }      -- matches a sibling project's package name
 *   { kind: "external",     source }                                       -- a regular third-party package
 */
function resolveModule(fromFile, source, { projects = [] } = {}) {
  if (isRelative(source)) {
    const baseDir = path.dirname(fromFile);
    const candidate = path.resolve(baseDir, source);
    return { kind: "relative", resolved: resolveAsFileOrDir(candidate), candidate, source };
  }

  if (isBuiltin(source)) {
    return { kind: "builtin", source };
  }

  const match = matchProjectBySpecifier(source, projects);
  if (match) {
    const candidate = match.subpath ? path.join(match.project.dir, match.subpath) : path.join(match.project.dir, match.project.main);
    return { kind: "cross-project", resolved: resolveAsFileOrDir(candidate), project: match.project, source };
  }

  return { kind: "external", source };
}

module.exports = { resolveModule, resolveAsFileOrDir, isRelative, isBuiltin, RESOLVE_EXTENSIONS };
