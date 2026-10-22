import { execFileSync } from "node:child_process";
import { ROOT } from "./paths.js";

export const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

export function currentBranch() {
  try {
    return git("rev-parse", "--abbrev-ref", "HEAD");
  } catch {
    return "desconocida";
  }
}

const CODE = /\.(ts|tsx|js|mjs|cjs)$/;
const SKIP = [/^recordings\//, /^metrics\//, /package-lock\.json$/, /\.snap$/, /^\.jev\//, /\.(svg|png|jpg|webp)$/];

export type Unit = { sha: string; subject: string; file: string; diff: string; movedLines: string[] };

/** Unidad de revisión: commit × archivo, contra el merge-base. Sin lockfiles, assets, generados ni borrados. */
export function reviewUnits(range: string): { base: string; head: string; units: Unit[] } {
  const [from, to] = range.includes("..") ? range.split("..") : ["main", range];
  const head = to || "HEAD";
  const base = git("merge-base", from || "main", head);
  const shas = git("rev-list", "--reverse", `${base}..${head}`).split("\n").filter(Boolean);
  const units: Unit[] = [];
  const lines = (diff: string, sign: "+" | "-") =>
    diff
      .split("\n")
      .filter((l) => l.startsWith(sign) && !l.startsWith(sign.repeat(3)))
      .map((l) => l.slice(1).trim())
      .filter(Boolean);
  for (const sha of shas) {
    const subject = git("log", "-1", "--format=%s", sha);
    const files = git("diff-tree", "--no-commit-id", "--name-status", "-r", sha)
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split("\t"))
      .filter(([status, file]) => status !== "D" && CODE.test(file) && !SKIP.some((r) => r.test(file)))
      .map(([, file]) => file);
    const diffs = files.map((file) => ({ file, diff: git("show", sha, "--format=", "--unified=3", "--", file).slice(0, 12000) }));
    for (const { file, diff } of diffs) {
      // Líneas que salen de este archivo y entran igual en otro del mismo commit: se movieron, no se quitaron.
      const addedElsewhere = new Set(diffs.filter((d) => d.file !== file).flatMap((d) => lines(d.diff, "+")));
      const movedLines = lines(diff, "-").filter((l) => addedElsewhere.has(l));
      units.push({ sha, subject, file, diff, movedLines });
    }
  }
  return { base, head, units };
}

export function treeOf(ref: string) {
  return git("rev-parse", `${ref}^{tree}`);
}
