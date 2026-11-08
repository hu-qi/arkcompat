#!/usr/bin/env node
import { constants } from "node:fs";
import { isUtf8 } from "node:buffer";
import { open, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  evaluate,
  predictRootDependencies,
  sha256,
} from "@arkcompat/evaluation";

const usage =
  "Usage: arkcompat-evaluate <labels.json> <predictions.json> <new-output-directory>\n       arkcompat-evaluate predict-dependencies <project> <cases.json>";
async function read(path: string) {
  const file = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const max = 2 * 1024 * 1024;
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > max) throw new Error();
    const buffer = Buffer.alloc(max + 1);
    let length = 0;
    while (length < buffer.length) {
      const result = await file.read(
        buffer,
        length,
        buffer.length - length,
        null,
      );
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > max) throw new Error();
    if (!isUtf8(buffer.subarray(0, length))) throw new Error();
    return buffer.subarray(0, length).toString("utf8");
  } finally {
    await file.close();
  }
}
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") console.log(usage);
  else if (args[0] === "predict-dependencies") {
    const [, project, cases] = args;
    if (
      args.length !== 3 ||
      !project ||
      !cases ||
      project.startsWith("--") ||
      cases.startsWith("--")
    )
      throw new Error();
    console.log(
      JSON.stringify(
        await predictRootDependencies(project, await read(cases)),
        null,
        2,
      ),
    );
  } else {
    if (args.length !== 3 || args.some((a) => a.startsWith("--")))
      throw new Error();
    const labels = await read(args[0]!);
    const predictions = await read(args[1]!);
    const report = evaluate(labels, predictions);
    const artifacts = {
      "labels.json": labels,
      "predictions.json": predictions,
      "results.json": JSON.stringify(report, null, 2) + "\n",
    };
    const hashes = Object.fromEntries(
      Object.entries(artifacts).map(([name, content]) => [
        name,
        sha256(content),
      ]),
    );
    const manifest =
      JSON.stringify(
        {
          schemaVersion: "0.1.0",
          acceptance: report.acceptance,
          independence: report.independence,
          files: hashes,
        },
        null,
        2,
      ) + "\n";
    await mkdir(args[2]!, { mode: 0o700 });
    for (const [name, content] of Object.entries(artifacts))
      await writeFile(join(args[2]!, name), content, {
        flag: "wx",
        mode: 0o600,
      });
    await writeFile(join(args[2]!, "manifest.json"), manifest, {
      flag: "wx",
      mode: 0o600,
    });
    await writeFile(
      join(args[2]!, "SHA256SUMS"),
      Object.entries({ ...hashes, "manifest.json": sha256(manifest) })
        .map(([name, hash]) => `${hash}  ${name}\n`)
        .join(""),
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        labeled: report.total.labeled,
        abstained: report.total.abstained,
        acceptance: report.acceptance,
      }),
    );
  }
} catch {
  console.error(
    `Evaluation failed; verify inputs, scan limits and any requested output directory. ${usage}`,
  );
  process.exitCode = 1;
}
