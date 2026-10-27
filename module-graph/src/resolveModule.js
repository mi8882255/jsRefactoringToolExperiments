const fs = require("fs");
const path = require("path");

const RESOLVE_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json"];
const INDEX_BASENAMES = RESOLVE_EXTENSIONS.map((ext) => `index${ext}`);

function isRelative(source) {
  return source.startsWith("./") || source.startsWith("../") || source === "." || source === "..";
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
 * Resolves an import/require specifier found inside `fromFile` to an
 * absolute path on disk. Returns:
 *   { resolved: absolutePath, external: false }  for files inside the project
 *   { resolved: null, external: true, source }    for bare package imports
 *   { resolved: null, external: false, source }   for relative imports that
 *                                                  could not be found on disk
 */
function resolveModule(fromFile, source) {
  if (!isRelative(source)) {
    // Also treat TS path-alias-looking absolute specifiers ("@/x") as
    // external, since resolving tsconfig `paths` is out of scope here.
    return { resolved: null, external: true, source };
  }

  const baseDir = path.dirname(fromFile);
  const candidate = path.resolve(baseDir, source);
  const resolved = resolveAsFileOrDir(candidate);

  return { resolved, external: false, source, candidate };
}

module.exports = { resolveModule, RESOLVE_EXTENSIONS, isRelative };
