const fs = require("fs");
const path = require("path");

/**
 * Finds every sub-project inside `rootDir` by locating `package.json`
 * files (skipping `ignoreDirs` such as node_modules). Each project knows
 * its own package name, so bare imports like `require('shared-utils')`
 * can later be recognized as "that other project in this folder" instead
 * of a generic third-party dependency.
 *
 * Returns [{ dir (absolute), id (relative to rootDir), name, main }]
 */
function findProjects(rootDir, ignoreDirs) {
  const projects = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    const pkgEntry = entries.find((e) => e.isFile() && e.name === "package.json");
    if (pkgEntry) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, pkgEntry.name), "utf8"));
        if (pkg.name) {
          const id = path.relative(rootDir, dir) || ".";
          projects.push({
            dir,
            id: id.split(path.sep).join("/"),
            name: pkg.name,
            main: pkg.main || pkg.module || "index.js",
          });
        }
      } catch (e) {
        // invalid/unreadable package.json - not a usable project boundary
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || ignoreDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
    }
  };

  walk(rootDir);
  return projects;
}

/** Returns the project whose directory most closely contains `absFile`, or null. */
function projectForFile(absFile, projects) {
  let best = null;
  for (const p of projects) {
    if (absFile === p.dir || absFile.startsWith(p.dir + path.sep)) {
      if (!best || p.dir.length > best.dir.length) best = p;
    }
  }
  return best;
}

/**
 * Splits a bare specifier like "@scope/pkg/sub/path" or "pkg/sub" into
 * its package name and subpath, and checks whether that package name
 * matches one of the detected local projects.
 */
function matchProjectBySpecifier(specifier, projects) {
  let pkgName, subpath;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    pkgName = parts.slice(0, 2).join("/");
    subpath = parts.slice(2).join("/");
  } else {
    const idx = specifier.indexOf("/");
    pkgName = idx === -1 ? specifier : specifier.slice(0, idx);
    subpath = idx === -1 ? "" : specifier.slice(idx + 1);
  }

  const project = projects.find((p) => p.name === pkgName);
  return project ? { project, subpath } : null;
}

module.exports = { findProjects, projectForFile, matchProjectBySpecifier };
