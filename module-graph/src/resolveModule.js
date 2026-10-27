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

function isBuiltin(source, extraBuiltins) {
  const name = source.startsWith("node:") ? source.slice(5) : source;
  return BUILTIN_SET.has(name) || (extraBuiltins && extraBuiltins.has(name));
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
 *   { kind: "builtin",      source }                                        -- Node core module (or one listed in extraBuiltins)
 *   { kind: "cross-project", resolved: absPath|null, project, source }      -- matches a sibling project's package name
 *   { kind: "external",     source }                                       -- a regular third-party package
 *
 * `extraBuiltins` (Set<string>) lets callers extend what counts as a
 * "standard library" to exclude from the graph, beyond Node's own
 * builtinModules - e.g. a monorepo's always-available polyfill shim.
 * Pass `skipBuiltinFilter: true` to disable the exclusion entirely and
 * let builtins fall through to "external" instead.
 */
function resolveModule(fromFile, source, { projects = [], extraBuiltins, skipBuiltinFilter = false } = {}) {
  if (isRelative(source)) {
    const baseDir = path.dirname(fromFile);
    const candidate = path.resolve(baseDir, source);
    return { kind: "relative", resolved: resolveAsFileOrDir(candidate), candidate, source };
  }

  if (!skipBuiltinFilter && isBuiltin(source, extraBuiltins)) {
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
