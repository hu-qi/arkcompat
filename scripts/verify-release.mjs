import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const artifactSet = {
  "arkcompat-cli-portable.tar.gz": { kind: "tar", top: "cli" },
  "arkcompat-source.tar.gz": { kind: "tar", top: "arkcompat" },
  "arkcompat-vscode.vsix": { kind: "zip", top: "extension" },
  "arkcompat-web.tar.gz": { kind: "tar", top: "arkcompat-web" },
  "arkcompat-deveco.zip": { kind: "zip" },
  "SBOM.cdx.json": { kind: "file" },
  "THIRD-PARTY-NOTICES.json": { kind: "file" },
  SHA256SUMS: { kind: "checksums" },
};

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function assertSafeNames(entries, label) {
  const tops = new Set();
  for (const entry of entries) {
    const trimmed = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    if (
      !trimmed ||
      trimmed.startsWith("/") ||
      /^[A-Za-z]:/.test(trimmed) ||
      trimmed.includes("\\")
    )
      throw new Error(`${label} contains an absolute or non-portable path.`);
    if (
      trimmed
        .split("/")
        .some((part) => part === "" || part === "." || part === "..")
    )
      throw new Error(`${label} contains a traversal path component.`);
    tops.add(trimmed.split("/")[0]);
  }
  return tops;
}

function inspectTar(path, label, expectedTop) {
  const names = run("tar", ["-tzf", path]).split("\n").filter(Boolean);
  const tops = assertSafeNames(names, label);
  if (expectedTop && (tops.size !== 1 || !tops.has(expectedTop)))
    throw new Error(
      `${label} must contain only the ${expectedTop}/ tree, found: ${[...tops].sort().join(", ")}`,
    );
  const verbose = run("tar", ["-tvzf", path]).split("\n").filter(Boolean);
  if (verbose.length !== names.length)
    throw new Error(`${label} listing is inconsistent.`);
  for (const line of verbose) {
    const mode = line.slice(0, 10);
    const type = mode[0];
    if (type !== "-" && type !== "d")
      throw new Error(`${label} contains a link or special entry.`);
    if (/[sStT]/.test(mode.slice(1)) || mode[8] === "w")
      throw new Error(
        `${label} contains setuid/setgid/sticky or open permissions.`,
      );
  }
  return names.length;
}

function inspectZip(path, label, expectedTop) {
  const names = run("unzip", ["-Z1", path]).split("\n").filter(Boolean);
  const tops = assertSafeNames(names, label);
  if (expectedTop && (tops.size !== 1 || !tops.has(expectedTop)))
    throw new Error(
      `${label} must contain only the ${expectedTop}/ tree, found: ${[...tops].sort().join(", ")}`,
    );
  const verbose = run("unzip", ["-Z", "-l", path])
    .split("\n")
    .filter((line) => /^[dl-][rwxStTs-]{9}/.test(line));
  if (verbose.length !== names.length)
    throw new Error(`${label} entry types could not be confirmed.`);
  for (const line of verbose) {
    const mode = line.slice(0, 10);
    if (mode[0] !== "-" && mode[0] !== "d")
      throw new Error(`${label} contains a link or special entry.`);
    if (/[sStT]/.test(mode.slice(1)) || mode[8] === "w")
      throw new Error(
        `${label} contains setuid/setgid/sticky or open permissions.`,
      );
  }
  return names.length;
}

function walk(directory, label) {
  let files = 0;
  const visit = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink())
        throw new Error(`${label} extracted a symlink: ${name}`);
      if (stat.isDirectory()) {
        if ((stat.mode & 0o7000) !== 0 || (stat.mode & 0o002) !== 0)
          throw new Error(`${label} extracted a directory with unsafe mode.`);
        visit(full);
      } else if (stat.isFile()) {
        if ((stat.mode & 0o7000) !== 0 || (stat.mode & 0o002) !== 0)
          throw new Error(`${label} extracted a file with unsafe mode.`);
        files++;
      } else {
        throw new Error(`${label} extracted a special file: ${name}`);
      }
    }
  };
  visit(directory);
  return files;
}

function extract(path, kind, label) {
  const destination = mkdtempSync(join(tmpdir(), "arkcompat-verify-"));
  if (kind === "tar")
    run("tar", ["-xzf", path, "-C", destination], { stdio: "ignore" });
  else run("unzip", ["-q", path, "-d", destination], { stdio: "ignore" });
  const files = walk(destination, label);
  return { destination, files };
}

function parseChecksums(path) {
  const entries = new Map();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line) continue;
    const match = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
    if (!match) throw new Error(`SHA256SUMS has a malformed line: ${line}`);
    const [, digest, name] = match;
    if (
      name.startsWith("/") ||
      name.includes("\\") ||
      name
        .split("/")
        .some((part) => part === "" || part === ".." || part === ".")
    )
      throw new Error(`SHA256SUMS has an unsafe path: ${name}`);
    if (entries.has(name))
      throw new Error(`SHA256SUMS lists ${name} more than once.`);
    entries.set(name, digest);
  }
  return entries;
}

function verifyInternalChecksums(directory) {
  const entries = parseChecksums(join(directory, "SHA256SUMS"));
  for (const [name, digest] of entries) {
    const path = resolve(directory, name);
    if (
      relative(directory, path).startsWith(`..${sep}`) ||
      relative(directory, path) === ".."
    )
      throw new Error(`Portable CLI checksum path escapes its root: ${name}`);
    if (!statSync(path).isFile())
      throw new Error(`Portable CLI checksum target is not a file: ${name}`);
    if (sha256File(path) !== digest)
      throw new Error(`Portable CLI checksum mismatch: ${name}`);
  }
  return entries.size;
}

function cliSmoke(directory) {
  const cli = join(directory, "cli");
  const manifest = JSON.parse(readFileSync(join(cli, "package.json"), "utf8"));
  const version = run(process.execPath, [
    join(cli, "dist/index.js"),
    "--version",
  ]).trim();
  if (version !== `arkcompat ${manifest.version}`)
    throw new Error(
      `Packaged CLI reports ${version}, expected ${manifest.version}.`,
    );
  const report = JSON.parse(
    run(process.execPath, [
      join(cli, "dist/index.js"),
      "scan",
      join(root, "fixtures/developer/yarn-berry-graph"),
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ]),
  );
  if (!Array.isArray(report.findings) || report.findings.length === 0)
    throw new Error("Packaged CLI scan produced no findings.");
  run(
    process.execPath,
    [join(root, "scripts/validate-runtime-provenance.mjs"), cli],
    {
      stdio: "ignore",
    },
  );
  return { version, findings: report.findings.length };
}

async function webSmoke(directory) {
  const server = join(directory, "arkcompat-web", "server.mjs");
  const child = spawn(process.execPath, [server, "--port", "0"], {
    cwd: join(directory, "arkcompat-web"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const base = await new Promise((accept, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Packaged Web viewer did not start.")),
        15_000,
      );
      let output = "";
      const settle = () => {
        const url = /http:\/\/127\.0\.0\.1:\d+/.exec(output)?.[0];
        if (url) {
          clearTimeout(timer);
          accept(url);
        }
      };
      child.stdout.on("data", (chunk) => {
        output += chunk;
        settle();
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Packaged Web viewer exited: ${code}`));
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const page = await fetch(`${base}/`);
    const body = await page.text();
    if (page.status !== 200 || !body.includes("ArkCompat"))
      throw new Error(`Packaged Web viewer returned ${page.status}.`);
    return { status: page.status };
  } finally {
    child.kill("SIGTERM");
  }
}

function parseArguments(argv) {
  const [directory, ...flags] = argv;
  if (!directory)
    throw new Error(
      "Usage: node scripts/verify-release.mjs <directory> [--deveco-expected=yes|no] [--smoke]",
    );
  let devecoExpected =
    process.platform === "darwin" && process.arch === "arm64";
  let smoke = false;
  for (const flag of flags) {
    if (flag === "--smoke") smoke = true;
    else if (flag === "--deveco-expected=yes") devecoExpected = true;
    else if (flag === "--deveco-expected=no") devecoExpected = false;
    else throw new Error(`Unknown argument: ${flag}`);
  }
  return { directory: resolve(directory), devecoExpected, smoke };
}

async function verify() {
  const { directory, devecoExpected, smoke } = parseArguments(
    process.argv.slice(2),
  );
  const expected = Object.keys(artifactSet).filter(
    (name) => name !== "arkcompat-deveco.zip" || devecoExpected,
  );
  const actual = readdirSync(directory).sort();
  const missing = expected.filter((name) => !actual.includes(name));
  const unexpected = actual.filter((name) => !expected.includes(name));
  if (missing.length || unexpected.length)
    throw new Error(
      `Unexpected artifact set; missing: [${missing.join(", ")}], unexpected: [${unexpected.join(", ")}]`,
    );

  const checksums = parseChecksums(join(directory, "SHA256SUMS"));
  const listed = [...checksums.keys()].sort();
  const artifactNames = expected.filter((name) => name !== "SHA256SUMS").sort();
  if (JSON.stringify(listed) !== JSON.stringify(artifactNames))
    throw new Error("SHA256SUMS does not list every artifact exactly once.");
  for (const [name, digest] of checksums) {
    if (sha256File(join(directory, name)) !== digest)
      throw new Error(`SHA256SUMS mismatch: ${name}`);
  }

  const summary = {
    directory,
    artifacts: {},
    checks: {
      checksums: checksums.size,
      internalCliChecksums: 0,
      extractedFiles: {},
      cli: null,
      web: null,
    },
  };
  const temporary = [];
  try {
    for (const name of expected) {
      const spec = artifactSet[name];
      const path = join(directory, name);
      summary.artifacts[name] = {
        bytes: statSync(path).size,
        sha256: sha256File(path),
      };
      if (spec.kind === "tar" || spec.kind === "zip") {
        const label = name;
        const entries =
          spec.kind === "tar"
            ? inspectTar(path, label, spec.top)
            : inspectZip(path, label, spec.top);
        const extracted = extract(path, spec.kind, label);
        temporary.push(extracted.destination);
        summary.checks.extractedFiles[name] = {
          entries,
          files: extracted.files,
        };
        if (name === "arkcompat-cli-portable.tar.gz") {
          const cli = join(extracted.destination, "cli");
          summary.checks.internalCliChecksums = verifyInternalChecksums(cli);
          if (
            sha256File(join(cli, "SBOM.cdx.json")) !==
            sha256File(join(directory, "SBOM.cdx.json"))
          )
            throw new Error("Release SBOM differs from the portable CLI SBOM.");
          if (
            sha256File(join(cli, "THIRD-PARTY-NOTICES.json")) !==
            sha256File(join(directory, "THIRD-PARTY-NOTICES.json"))
          )
            throw new Error(
              "Release notices differ from the portable CLI notices.",
            );
          if (smoke) summary.checks.cli = cliSmoke(extracted.destination);
        }
        if (name === "arkcompat-web.tar.gz" && smoke)
          summary.checks.web = await webSmoke(extracted.destination);
      }
    }
  } finally {
    for (const destination of temporary)
      rmSync(destination, { recursive: true, force: true });
  }

  console.log(JSON.stringify(summary, null, 2));
}

verify().catch((error) => {
  console.error(`Release verification failed: ${error.message}`);
  process.exitCode = 1;
});
