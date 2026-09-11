import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".lovable",
  "coverage",
]);

// Historical records must never be renamed, so applied migrations are immutable
// and excluded. Generated types and the legacy-history filter intentionally
// reference archived data.
const ALLOWED_PATHS = [
  "supabase/migrations/",
  "src/integrations/supabase/types.ts",
  "src/components/WelcomeScreen.tsx",
  "src/test/residual-legacy-scan.test.ts",
  "src/test/knowledge-domain.test.ts",
];

const PATTERN = /wallchain|wall\s?chain|wall-chain|infofi|info\s?fi/i;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const TEXT_EXT = /\.(ts|tsx|js|jsx|json|html|css|md|toml|sql|txt)$/i;

describe("residual legacy reference scan", () => {
  it("finds zero active legacy ecosystem references", () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).split("\\").join("/");
      if (!TEXT_EXT.test(rel)) continue;
      if (ALLOWED_PATHS.some((p) => rel.startsWith(p))) continue;
      const content = readFileSync(file, "utf8");
      if (PATTERN.test(content)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("has no campaign or ecosystem selector left in the app", () => {
    const offenders: string[] = [];
    for (const file of walk(join(ROOT, "src"))) {
      const rel = relative(ROOT, file).split("\\").join("/");
      if (!/\.tsx?$/.test(rel)) continue;
      if (ALLOWED_PATHS.some((p) => rel.startsWith(p))) continue;
      const content = readFileSync(file, "utf8");
      if (/CampaignSelector|composite_score|brand_alignment_score/.test(content)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
