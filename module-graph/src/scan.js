const fs = require("fs");
const path = require("path");

const DEFAULT_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"];
const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".cache",
  "legacy",
]);

/**
 * Recursively walks `rootDir` and returns absolute paths of every source
 * file whose extension is in `extensions`, skipping anything in `ignoreDirs`.
 */
function scanDirectory(rootDir, { extensions = DEFAULT_EXTENSIONS, ignoreDirs = DEFAULT_IGNORE_DIRS } = {}) {
  const files = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        if (extensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    }
  };

  walk(rootDir);
  return files;
}

module.exports = { scanDirectory, DEFAULT_EXTENSIONS, DEFAULT_IGNORE_DIRS };
