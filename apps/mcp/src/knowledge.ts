import {
  isKnowledgeTimestamp,
  queryKnowledge,
  readKnowledgeSnapshot,
} from "@arkcompat/knowledge";
import type {
  KnowledgeQuery,
  KnowledgeQueryResult,
} from "@arkcompat/knowledge";
import type { KnowledgeSnapshot } from "@arkcompat/contracts";

export interface KnowledgeStore {
  query(request: KnowledgeQuery): KnowledgeQueryResult;
}

export async function loadKnowledgeStore(
  path: string,
  asOf: string,
): Promise<KnowledgeStore> {
  if (!isKnowledgeTimestamp(asOf))
    throw new Error(
      "Invalid knowledge startup configuration; use a canonical UTC timestamp.",
    );
  const snapshot: KnowledgeSnapshot = await readKnowledgeSnapshot(path);
  return {
    query: (request) => queryKnowledge(snapshot, request, asOf),
  };
}
