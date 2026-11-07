import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { apiRuleSnapshotByteLimit } from "@arkcompat/core";

export async function readRuleInput(path: string) {
  let file;
  try {
    file = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > apiRuleSnapshotByteLimit)
      throw new Error();
    const bytes = Buffer.alloc(apiRuleSnapshotByteLimit + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await file.read(
        bytes,
        length,
        bytes.length - length,
        null,
      );
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > apiRuleSnapshotByteLimit) throw new Error();
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes.subarray(0, length),
    );
  } catch {
    throw new Error(
      "Cannot read API rule snapshot: expected a bounded regular UTF-8 file.",
    );
  } finally {
    await file?.close();
  }
}
