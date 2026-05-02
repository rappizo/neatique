import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type NextTrace = {
  files?: string[];
};

const NEXT_SERVER_APP_ROOT = path.resolve(process.cwd(), ".next", "server", "app");
const FORBIDDEN_TRACE_RULES = [
  {
    label: "git internals",
    test: (value: string) => /(^|\/)\.git\//.test(value)
  },
  {
    label: "Next build cache",
    test: (value: string) => /(^|\/)\.next\/cache\//.test(value) || /(^|\/)cache\/webpack\//.test(value)
  },
  {
    label: "comic workspace files",
    test: (value: string) => /(^|\/)comic\//.test(value)
  },
  {
    label: "generated public comic references",
    test: (value: string) => /(^|\/)public\/comic-reference\//.test(value)
  }
];
const CONFIGURED_TRACE_EXCLUDE_RULES = [
  (value: string) => value === ".git" || value.startsWith(".git/"),
  (value: string) => value === ".next/cache" || value.startsWith(".next/cache/"),
  (value: string) => value === "comic" || value.startsWith("comic/"),
  (value: string) => value === "public/comic-reference" || value.startsWith("public/comic-reference/")
];

async function listTraceFiles(root: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        return listTraceFiles(absolutePath);
      }

      return entry.isFile() && entry.name.endsWith(".nft.json") ? [absolutePath] : [];
    })
  );

  return nested.flat();
}

function normalizeTraceEntry(value: string) {
  return value.replace(/\\/g, "/");
}

function toProjectRelativeTraceEntry(traceFile: string, value: string) {
  return normalizeTraceEntry(path.relative(process.cwd(), path.resolve(path.dirname(traceFile), value)));
}

function isConfiguredTraceExclude(projectRelativePath: string) {
  return CONFIGURED_TRACE_EXCLUDE_RULES.some((test) => test(projectRelativePath));
}

async function readTrace(filePath: string) {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as NextTrace;
  return Array.isArray(parsed.files) ? parsed.files.map(normalizeTraceEntry) : [];
}

async function main() {
  const traceFiles = await listTraceFiles(NEXT_SERVER_APP_ROOT);
  const violations: Array<{
    routeTrace: string;
    label: string;
    file: string;
  }> = [];

  for (const traceFile of traceFiles) {
    const routeTrace = normalizeTraceEntry(path.relative(process.cwd(), traceFile));
    const tracedFiles = await readTrace(traceFile);

    for (const file of tracedFiles) {
      if (isConfiguredTraceExclude(toProjectRelativeTraceEntry(traceFile, file))) {
        continue;
      }

      const rule = FORBIDDEN_TRACE_RULES.find((candidate) => candidate.test(file));

      if (!rule) {
        continue;
      }

      violations.push({
        routeTrace,
        label: rule.label,
        file
      });
    }
  }

  if (violations.length > 0) {
    const shown = violations.slice(0, 30);
    console.error("Next function trace guard failed. Large local files were bundled into server functions.");
    console.error(
      shown.map((violation) => `- ${violation.routeTrace}: ${violation.label} -> ${violation.file}`).join("\n")
    );

    if (violations.length > shown.length) {
      console.error(`...and ${violations.length - shown.length} more trace violation(s).`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Next function trace guard passed for ${traceFiles.length} function trace files.`);
}

main().catch((error) => {
  console.error("Next function trace guard crashed.");
  console.error(error);
  process.exitCode = 1;
});
