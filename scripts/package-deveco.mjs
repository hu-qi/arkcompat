import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const usage =
  "Usage: pnpm package:deveco <DevEco-Studio.app> <new-output-directory> [--prestage]";
const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const here = fileURLToPath(new URL("../apps/deveco", import.meta.url));
const sourceCli = fileURLToPath(
  new URL("../apps/cli/dist/index.js", import.meta.url),
);
const fixedTime = new Date("1980-02-01T00:00:00.000Z");
const quote = (text) => "'" + text.replaceAll("'", "'\"'\"'") + "'";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  });
}

function files(rootPath) {
  return readdirSync(rootPath, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const absolute = join(entry.parentPath, entry.name);
      if (realpathSync(absolute) !== absolute)
        throw new Error("Adapter package contains a symlink.");
      return absolute;
    })
    .sort();
}

function normalizeTimes(paths) {
  for (const path of paths) utimesSync(path, fixedTime, fixedTime);
  const top = [...paths].sort((a, b) => b.length - a.length);
  for (const path of top) {
    const directory = resolve(path, "..");
    utimesSync(directory, fixedTime, fixedTime);
  }
}

function build(application, output, prestage) {
  if (process.platform !== "darwin" || process.arch !== "arm64")
    throw new Error("This adapter packager requires macOS arm64.");
  const app = realpathSync(application);
  const contents = join(app, "Contents");
  const product = JSON.parse(
    readFileSync(join(contents, "Resources/product-info.json"), "utf8"),
  );
  if (
    product.productCode !== "DS" ||
    product.version !== "26.0.0.865" ||
    product.buildNumber !== "261.23567.138.36.2600865"
  )
    throw new Error("Expected exact DevEco Studio 26.0.0.865 build.");
  run("/usr/bin/codesign", ["--verify", "--strict", app]);

  const requested = resolve(output);
  const out = join(realpathSync(dirname(requested)), basename(requested));
  for (const path of [out, app, root, process.execPath])
    if (/[\s"']/.test(path))
      throw new Error(
        "Use paths without whitespace or quotes for the adapter rehearsal.",
      );
  mkdirSync(out, { mode: 0o700 });
  const packageRoot = join(out, "package");
  const pluginRoot = join(packageRoot, "arkcompat");
  const lib = join(pluginRoot, "lib");
  const classes = join(out, "classes");
  const plugins = join(out, "plugins");
  const fixture = join(out, "ArkCompatProject");
  mkdirSync(join(classes, "META-INF"), { recursive: true });
  mkdirSync(lib, { recursive: true });
  mkdirSync(plugins);
  mkdirSync(fixture);

  run(
    process.execPath,
    [join(root, "scripts/package-cli.mjs"), join(lib, "runtime")],
    { cwd: root },
  );
  copyFileSync(join(here, "plugin.xml"), join(classes, "META-INF/plugin.xml"));
  run(join(contents, "jbr/Contents/Home/bin/javac"), [
    "-proc:none",
    "-Xlint:all",
    "-Werror",
    "-classpath",
    join(contents, "lib/*"),
    "-d",
    classes,
    join(here, "src/org/arkcompat/deveco/ArkCompatScanAction.java"),
  ]);
  const jar = join(lib, "arkcompat-deveco.jar");
  run(process.env.ARKCOMPAT_DE_JAR ?? "/usr/bin/jar", [
    "--create",
    "--date=1980-02-01T00:00:00Z",
    "--file",
    jar,
    "-C",
    classes,
    ".",
  ]);
  for (const file of ["package.json", "main.ts"])
    copyFileSync(
      join(root, "spikes/deveco/fixture", file),
      join(fixture, file),
    );

  const runtimeNode = join(contents, "tools/node/bin/node");
  const embeddedCli = join(lib, "runtime/dist/index.js");
  const expected = run(runtimeNode, [
    embeddedCli,
    "scan",
    fixture,
    "--runtime",
    "arkts",
    "--release",
    "6.0.0",
    "--api-level",
    "20",
  ]);
  const source = run(process.execPath, [
    sourceCli,
    "scan",
    fixture,
    "--runtime",
    "arkts",
    "--release",
    "6.0.0",
    "--api-level",
    "20",
  ]);
  if (expected !== source)
    throw new Error("Embedded and source CLI fixture reports differ.");
  writeFileSync(join(out, "expected-report.json"), expected, {
    flag: "wx",
    mode: 0o600,
  });

  const zip = join(out, "arkcompat-deveco.zip");
  const packagedFiles = files(packageRoot);
  normalizeTimes(packagedFiles);
  run(
    "/usr/bin/zip",
    [
      "-X",
      "-q",
      zip,
      ...packagedFiles.map((path) => relative(packageRoot, path)),
    ],
    { cwd: packageRoot },
  );
  if (prestage) {
    const pluginInstalled = join(plugins, "arkcompat");
    mkdirSync(join(pluginInstalled, "lib"), { recursive: true });
    copyFileSync(jar, join(pluginInstalled, "lib/arkcompat-deveco.jar"));
    // The runtime stays under the packaged plugin for a realistic local path.
    run("/usr/bin/ditto", [
      join(lib, "runtime"),
      join(pluginInstalled, "lib/runtime"),
    ]);
  }

  const jvm = ["config", "system", "plugins", "log"].map(
    (name) => `-Didea.${name}.path=${join(out, name)}`,
  );
  jvm.push(
    `-Darkcompat.deveco.report-root=${out}`,
    `-Darkcompat.deveco.observation-root=${out}`,
    "-Xmx1536m",
  );
  const launch = `#!/bin/sh\nexec env ${quote(`_JAVA_OPTIONS=${jvm.join(" ")}`)} ${quote(join(contents, "MacOS/devecostudio"))} ${quote(fixture)}\n`;
  writeFileSync(join(out, "launch.sh"), launch, { flag: "wx", mode: 0o700 });
  console.log(
    prestage
      ? "Prepared the isolated prestaged adapter. Run launch.sh and invoke Tools → ArkCompat: Scan Current Project."
      : "Prepared the isolated disk-install ZIP and empty plugins directory. Run launch.sh and install arkcompat-deveco.zip from disk.",
  );
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") console.log(usage);
  else if (args.length === 2 || (args.length === 3 && args[2] === "--prestage"))
    build(args[0], args[1], args[2] === "--prestage");
  else throw new Error(usage);
} catch (error) {
  console.error(
    "DevEco adapter packaging failed; verify the exact build, local JDK tools and a new output directory.",
  );
  if (error?.message === usage) console.error(usage);
  process.exitCode = 1;
}
