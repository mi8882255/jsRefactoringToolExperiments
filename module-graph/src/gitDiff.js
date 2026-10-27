const { execFileSync } = require("child_process");
const path = require("path");

function run(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (e) {
    return null;
  }
}

function findGitRoot(dir) {
  return run(["rev-parse", "--show-toplevel"], dir);
}

/**
 * Resolves which files changed for a given diff spec, run from `dir`
 * (any directory inside the repo - the git root is discovered automatically).
 *
 * `diffSpec` is whatever you'd put after `git diff --name-only`:
 *   undefined / ""   -> changes since HEAD (staged + unstaged) plus new
 *                        untracked files - i.e. "what's uncommitted right now"
 *   "main"            -> changes between `main` and the working tree
 *                        (also includes untracked files, for a "what have I
 *                        changed relative to main" review)
 *   "main HEAD"       -> changes strictly between two commits/refs
 *                        (untracked files are not relevant here, so excluded)
 *
 * Returns { gitRoot, files: [absolutePath], error, diffArgs }
 */
function getChangedFiles(dir, diffSpec) {
  const gitRoot = findGitRoot(dir);
  if (!gitRoot) {
    return { gitRoot: null, files: [], error: "not inside a git repository", diffArgs: [] };
  }

  const tokens = diffSpec ? diffSpec.trim().split(/\s+/).filter(Boolean) : [];
  const refArgs = tokens.length ? tokens : ["HEAD"];
  const diffOut = run(["diff", "--name-only", "--diff-filter=ACMR", ...refArgs], gitRoot);

  if (diffOut === null) {
    return { gitRoot, files: [], error: `git diff failed for: ${refArgs.join(" ")}`, diffArgs: refArgs };
  }

  const diffFiles = diffOut.split("\n").filter(Boolean);

  let untracked = [];
  if (tokens.length <= 1) {
    const statusOut = run(["status", "--porcelain", "--untracked-files=all"], gitRoot);
    if (statusOut) {
      untracked = statusOut
        .split("\n")
        .filter((l) => l.startsWith("?? "))
        .map((l) => l.slice(3).trim());
    }
  }

  const relFiles = Array.from(new Set([...diffFiles, ...untracked]));
  const absFiles = relFiles.map((f) => path.join(gitRoot, f));

  return { gitRoot, files: absFiles, error: null, diffArgs: refArgs };
}

module.exports = { getChangedFiles, findGitRoot };
