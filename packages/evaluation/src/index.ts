import { createHash } from "node:crypto";
import { Ajv } from "ajv";
import type { DependencySection, TargetProfile } from "@arkcompat/contracts";
import {
  exportKnowledge,
  importKnowledge,
  isKnowledgeTimestamp,
  queryKnowledge,
} from "@arkcompat/knowledge";

interface Labels {
  schemaVersion: "0.1.0";
  datasetId: string;
  origin: "developer-fixture" | "external-unverified";
  provenance: {
    source: string;
    license: string;
    labelAuthor: string;
    sdk: string;
    target: string;
  };
  binding?: Predictions["binding"];
  cases: { id: string; category: string; expected: "positive" | "negative" }[];
}
interface Predictions {
  schemaVersion: "0.1.0";
  datasetId: string;
  scannerVersion: string;
  rulesSnapshot: string;
  knowledgeSnapshot: string;
  binding?:
    | {
        scope: "root-declaration-presence" | "dependency-graph";
        casesSha256: string;
        scanReportSha256: string;
      }
    | {
        scope: "incompatible-api";
        casesSha256: string;
        scanReportSha256: string;
        rulesSha256: string;
      }
    | {
        scope: "replacement-mapping" | "missing-port";
        casesSha256: string;
        knowledgeSha256: string;
      };
  predictions: { id: string; actual: "positive" | "negative" | "unknown" }[];
}
export interface Metrics {
  labeled: number;
  positive: number;
  negative: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  abstained: number;
  abstainedPositive: number;
  abstainedNegative: number;
  missingPredictions: number;
  precision: number | null;
  recall: number | null;
  accuracy: number | null;
  coverage: number | null;
  falsePositiveRate: number | null;
}
const ajv = new Ajv();
const id = { type: "string", pattern: "^[A-Za-z0-9._:+-]{1,128}$" };
const digest = { type: "string", pattern: "^[a-f0-9]{64}$" };
const packageName = {
  type: "string",
  maxLength: 214,
  pattern: "^(?:@[A-Za-z0-9][A-Za-z0-9._~-]*\/)?[A-Za-z0-9][A-Za-z0-9._~-]*$",
};
const targetSchema = {
  type: "object",
  additionalProperties: false,
  required: ["os", "runtime", "release"],
  properties: {
    os: { const: "HarmonyOS" },
    runtime: { enum: ["arkts", "arkweb", "react-native"] },
    release: {
      type: "string",
      maxLength: 64,
      pattern: "^\\d+\\.\\d+\\.\\d+$",
    },
    apiLevel: {
      type: "integer",
      minimum: 1,
      maximum: Number.MAX_SAFE_INTEGER,
    },
  },
};
const sectionSchema = {
  enum: [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ],
};
const exactSemverString = {
  type: "string",
  maxLength: 128,
  pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$",
};
interface DependencyCases {
  schemaVersion: "0.1.0";
  datasetId: string;
  target: TargetProfile;
  cases: { id: string; section: DependencySection; name: string }[];
}
interface DependencyGraphCases {
  schemaVersion: "0.1.0";
  datasetId: string;
  target: TargetProfile;
  cases: {
    id: string;
    modulePath?: string;
    kind: "direct" | "transitive";
    section?: DependencySection;
    name: string;
    resolvedVersion?: string;
  }[];
}
interface IncompatibleApiCases {
  schemaVersion: "0.1.0";
  datasetId: string;
  target: TargetProfile;
  cases: {
    id: string;
    path: string;
    line: number;
    column: number;
    module: string;
    apiPath: string[];
    kind: "call" | "construct";
  }[];
}
interface ReplacementCases {
  schemaVersion: "0.1.0";
  datasetId: string;
  target: TargetProfile;
  cases: {
    id: string;
    package: string;
    version: string;
    requiredFeatures?: string[];
    targetRegistry: "ohpm" | "gitcode" | "npm";
    targetName: string;
  }[];
}
interface MissingPortCases {
  schemaVersion: "0.1.0";
  datasetId: string;
  target: TargetProfile;
  cases: { id: string; package: string; version: string }[];
}
const validateDependencyCases = ajv.compile<DependencyCases>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "target", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    target: targetSchema,
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "section", "name"],
        properties: {
          id,
          section: sectionSchema,
          name: packageName,
        },
      },
    },
  },
});
const validateDependencyGraphCases = ajv.compile<DependencyGraphCases>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "target", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    target: targetSchema,
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "name"],
        properties: {
          id,
          modulePath: { type: "string", minLength: 1, maxLength: 256 },
          kind: { enum: ["direct", "transitive"] },
          section: sectionSchema,
          name: packageName,
          resolvedVersion: exactSemverString,
        },
      },
    },
  },
});
const validateIncompatibleApiCases = ajv.compile<IncompatibleApiCases>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "target", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    target: targetSchema,
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "path", "line", "column", "module", "apiPath", "kind"],
        properties: {
          id,
          path: { type: "string", minLength: 1, maxLength: 512 },
          line: { type: "integer", minimum: 1 },
          column: { type: "integer", minimum: 1 },
          module: { type: "string", minLength: 1, maxLength: 256 },
          apiPath: {
            type: "array",
            minItems: 1,
            maxItems: 16,
            items: { type: "string", minLength: 1, maxLength: 128 },
          },
          kind: { enum: ["call", "construct"] },
        },
      },
    },
  },
});
const validateReplacementCases = ajv.compile<ReplacementCases>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "target", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    target: targetSchema,
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "package", "version", "targetRegistry", "targetName"],
        properties: {
          id,
          package: packageName,
          version: exactSemverString,
          requiredFeatures: {
            type: "array",
            maxItems: 64,
            items: { type: "string", minLength: 1, maxLength: 128 },
          },
          targetRegistry: { enum: ["ohpm", "gitcode", "npm"] },
          targetName: { type: "string", minLength: 1, maxLength: 214 },
        },
      },
    },
  },
});
const validateMissingPortCases = ajv.compile<MissingPortCases>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "target", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    target: targetSchema,
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "package", "version"],
        properties: {
          id,
          package: packageName,
          version: exactSemverString,
        },
      },
    },
  },
});
const metadata = {
  type: "string",
  minLength: 1,
  maxLength: 512,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
};
const bindingSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["scope", "casesSha256", "scanReportSha256"],
      properties: {
        scope: { enum: ["root-declaration-presence", "dependency-graph"] },
        casesSha256: digest,
        scanReportSha256: digest,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["scope", "casesSha256", "scanReportSha256", "rulesSha256"],
      properties: {
        scope: { const: "incompatible-api" },
        casesSha256: digest,
        scanReportSha256: digest,
        rulesSha256: digest,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["scope", "casesSha256", "knowledgeSha256"],
      properties: {
        scope: { enum: ["replacement-mapping", "missing-port"] },
        casesSha256: digest,
        knowledgeSha256: digest,
      },
    },
  ],
} as const;
const validateLabels = ajv.compile<Labels>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "origin", "provenance", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    origin: { enum: ["developer-fixture", "external-unverified"] },
    provenance: {
      type: "object",
      additionalProperties: false,
      required: ["source", "license", "labelAuthor", "sdk", "target"],
      properties: {
        source: metadata,
        license: metadata,
        labelAuthor: metadata,
        sdk: metadata,
        target: metadata,
      },
    },
    binding: bindingSchema,
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "category", "expected"],
        properties: {
          id,
          category: { type: "string", pattern: "^[a-z][a-z0-9.-]{0,63}$" },
          expected: { enum: ["positive", "negative"] },
        },
      },
    },
  },
});
const validatePredictions = ajv.compile<Predictions>({
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "datasetId",
    "scannerVersion",
    "rulesSnapshot",
    "knowledgeSnapshot",
    "predictions",
  ],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    scannerVersion: id,
    rulesSnapshot: id,
    knowledgeSnapshot: id,
    binding: bindingSchema,
    predictions: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "actual"],
        properties: {
          id,
          actual: { enum: ["positive", "negative", "unknown"] },
        },
      },
    },
  },
});
export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
function sameBinding(
  left: NonNullable<Labels["binding"]>,
  right: NonNullable<Predictions["binding"]>,
) {
  if (left.scope !== right.scope) return false;
  const fields =
    left.scope === "replacement-mapping" || left.scope === "missing-port"
      ? (["scope", "casesSha256", "knowledgeSha256"] as const)
      : left.scope === "incompatible-api"
        ? (["scope", "casesSha256", "scanReportSha256", "rulesSha256"] as const)
        : (["scope", "casesSha256", "scanReportSha256"] as const);
  const leftRecord = left as unknown as Record<string, string>;
  const rightRecord = right as unknown as Record<string, string>;
  return fields.every((field) => leftRecord[field] === rightRecord[field]);
}
function parse(text: string): unknown {
  if (
    typeof text !== "string" ||
    Buffer.byteLength(text, "utf8") > 2 * 1024 * 1024
  )
    throw new Error();
  return JSON.parse(text);
}
function declarationKey(section: DependencySection, name: string) {
  return JSON.stringify([section, name]);
}

/** Root declaration presence only. Expected labels never enter this path. */
export async function predictRootDependencies(
  project: string,
  casesText: string,
): Promise<Predictions> {
  let manifest: DependencyCases;
  try {
    const input = parse(casesText);
    if (!validateDependencyCases(input)) throw new Error();
    const ids = new Set(input.cases.map(({ id }) => id));
    const selectors = new Set(
      input.cases.map(({ section, name }) => declarationKey(section, name)),
    );
    if (
      ids.size !== input.cases.length ||
      selectors.size !== input.cases.length
    )
      throw new Error();
    manifest = input;
  } catch {
    throw new Error("Invalid dependency prediction cases.");
  }
  const { scanProject, formatReport } = await import("@arkcompat/core");
  let report;
  try {
    const { os, release, runtime, apiLevel } = manifest.target;
    report = await scanProject(project, {
      os,
      release,
      runtime,
      ...(apiLevel === undefined ? {} : { apiLevel }),
    });
  } catch {
    throw new Error("Dependency scan failed; no predictions generated.");
  }
  const declarations = new Set(
    report.dependencies.map(({ section, name }) =>
      declarationKey(section, name),
    ),
  );
  return {
    schemaVersion: "0.1.0",
    datasetId: manifest.datasetId,
    scannerVersion: report.scannerVersion,
    rulesSnapshot: report.snapshots.rules,
    knowledgeSnapshot: report.snapshots.knowledge,
    binding: {
      scope: "root-declaration-presence",
      casesSha256: sha256(casesText),
      scanReportSha256: sha256(formatReport(report, "json") + "\n"),
    },
    predictions: manifest.cases.map(({ id, section, name }) => ({
      id,
      actual: declarations.has(declarationKey(section, name))
        ? "positive"
        : "negative",
    })),
  };
}

/** Label-blind full dependency graph prediction (direct + transitive + versioned). */
export async function predictDependencyGraph(
  project: string,
  casesText: string,
): Promise<Predictions> {
  let manifest: DependencyGraphCases;
  try {
    const input = parse(casesText);
    if (!validateDependencyGraphCases(input)) throw new Error();
    const ids = new Set(input.cases.map(({ id }) => id));
    if (ids.size !== input.cases.length) throw new Error();
    manifest = input;
  } catch {
    throw new Error("Invalid dependency graph prediction cases.");
  }
  const { scanProject, formatReport } = await import("@arkcompat/core");
  let report;
  try {
    const { os, release, runtime, apiLevel } = manifest.target;
    report = await scanProject(project, {
      os,
      release,
      runtime,
      ...(apiLevel === undefined ? {} : { apiLevel }),
    });
  } catch {
    throw new Error("Dependency scan failed; no predictions generated.");
  }
  const scopes = new Map<
    string,
    {
      declarations: typeof report.dependencies;
      graph: typeof report.dependencyGraph;
    }
  >([
    [".", { declarations: report.dependencies, graph: report.dependencyGraph }],
    ...(report.modules ?? []).map(
      (mod) =>
        [
          mod.path,
          { declarations: mod.dependencies, graph: mod.dependencyGraph },
        ] as const,
    ),
  ]);
  return {
    schemaVersion: "0.1.0",
    datasetId: manifest.datasetId,
    scannerVersion: report.scannerVersion,
    rulesSnapshot: report.snapshots.rules,
    knowledgeSnapshot: report.snapshots.knowledge,
    binding: {
      scope: "dependency-graph",
      casesSha256: sha256(casesText),
      scanReportSha256: sha256(formatReport(report, "json") + "\n"),
    },
    predictions: manifest.cases.map((item) => {
      const scope = scopes.get(item.modulePath ?? ".");
      if (!scope) return { id: item.id, actual: "negative" as const };
      const nodes = new Map(scope.graph.nodes.map((node) => [node.id, node]));
      if (item.kind === "direct") {
        const declared = scope.declarations.some(
          (dep) =>
            dep.name === item.name &&
            (item.section === undefined || dep.section === item.section),
        );
        if (!declared) return { id: item.id, actual: "negative" as const };
        if (item.resolvedVersion === undefined) {
          return { id: item.id, actual: "positive" as const };
        }
        const matched = scope.graph.edges.some(
          (edge) =>
            edge.from === "" &&
            edge.name === item.name &&
            (item.section === undefined || edge.section === item.section) &&
            edge.resolution === "locked" &&
            edge.to !== null &&
            nodes.get(edge.to)?.version === item.resolvedVersion,
        );
        return {
          id: item.id,
          actual: matched ? ("positive" as const) : ("negative" as const),
        };
      }
      const transitiveMatched = scope.graph.edges.some((edge) => {
        if (edge.from === "" || edge.resolution !== "locked" || !edge.to) {
          return false;
        }
        const node = nodes.get(edge.to);
        if (!node || node.name !== item.name) return false;
        return (
          item.resolvedVersion === undefined ||
          node.version === item.resolvedVersion
        );
      });
      return {
        id: item.id,
        actual: transitiveMatched
          ? ("positive" as const)
          : ("negative" as const),
      };
    }),
  };
}

/** Label-blind static API incompatibility prediction using pinned rules. */
export async function predictIncompatibleApis(
  project: string,
  casesText: string,
  rulesText: string,
): Promise<Predictions> {
  let manifest: IncompatibleApiCases;
  try {
    const input = parse(casesText);
    if (!validateIncompatibleApiCases(input)) throw new Error();
    const ids = new Set(input.cases.map(({ id }) => id));
    if (ids.size !== input.cases.length) throw new Error();
    manifest = input;
  } catch {
    throw new Error("Invalid API prediction cases.");
  }
  const { scanProject, formatReport, evaluateApiRules } =
    await import("@arkcompat/core");
  let report;
  let evaluated;
  try {
    const { os, release, runtime, apiLevel } = manifest.target;
    report = await scanProject(project, {
      os,
      release,
      runtime,
      ...(apiLevel === undefined ? {} : { apiLevel }),
    });
    evaluated = evaluateApiRules(report, rulesText);
  } catch {
    throw new Error("API prediction failed; no predictions generated.");
  }
  const siteKey = (
    path: string,
    line: number,
    column: number,
    module: string,
    apiPath: string[],
    kind: "call" | "construct",
  ) => JSON.stringify([path, line, column, module, apiPath, kind]);
  const statuses = new Map<string, string>();
  for (const item of evaluated.results) {
    statuses.set(
      siteKey(
        item.usage.location.path,
        item.usage.location.line,
        item.usage.location.column,
        item.usage.module,
        item.usage.path,
        item.usage.kind,
      ),
      item.status,
    );
  }
  return {
    schemaVersion: "0.1.0",
    datasetId: manifest.datasetId,
    scannerVersion: report.scannerVersion,
    rulesSnapshot: evaluated.snapshot.id,
    knowledgeSnapshot: report.snapshots.knowledge,
    binding: {
      scope: "incompatible-api",
      casesSha256: sha256(casesText),
      scanReportSha256: sha256(formatReport(report, "json") + "\n"),
      rulesSha256: evaluated.snapshot.sha256,
    },
    predictions: manifest.cases.map((item) => {
      if (manifest.target.apiLevel === undefined) {
        return { id: item.id, actual: "unknown" as const };
      }
      const status = statuses.get(
        siteKey(
          item.path,
          item.line,
          item.column,
          item.module,
          item.apiPath,
          item.kind,
        ),
      );
      if (status === undefined)
        return { id: item.id, actual: "negative" as const };
      if (status === "incompatible")
        return { id: item.id, actual: "positive" as const };
      return { id: item.id, actual: "unknown" as const };
    }),
  };
}

/** Label-blind replacement recommendation prediction against a knowledge snapshot. */
export function predictReplacements(
  casesText: string,
  snapshotText: string,
  asOf: string,
): Predictions {
  let manifest: ReplacementCases;
  let snapshot;
  try {
    const input = parse(casesText);
    if (!validateReplacementCases(input)) throw new Error();
    const ids = new Set(input.cases.map(({ id }) => id));
    if (ids.size !== input.cases.length) throw new Error();
    if (!isKnowledgeTimestamp(asOf)) throw new Error();
    manifest = input;
    snapshot = importKnowledge(snapshotText);
  } catch {
    throw new Error("Invalid replacement prediction inputs.");
  }
  const knowledgeSha256 = sha256(exportKnowledge(snapshot));
  const predictions = manifest.cases.map((item) => {
    if (manifest.target.apiLevel === undefined) {
      return { id: item.id, actual: "unknown" as const };
    }
    const outcome = queryKnowledge(
      snapshot,
      { package: item.package, version: item.version, target: manifest.target },
      asOf,
    );
    if (outcome.matches.length !== 1) {
      return { id: item.id, actual: "unknown" as const };
    }
    const record = outcome.matches[0]!;
    if (
      record.availability === "ohpm-release" ||
      record.availability === "gitcode-port"
    ) {
      if (
        record.target &&
        record.target.registry === item.targetRegistry &&
        record.target.name === item.targetName
      ) {
        const missingFeature = (item.requiredFeatures ?? []).some((feat) =>
          record.features.excluded.includes(feat),
        );
        return {
          id: item.id,
          actual: missingFeature
            ? ("negative" as const)
            : ("positive" as const),
        };
      }
      return { id: item.id, actual: "negative" as const };
    }
    if (
      record.availability === "pure-js" ||
      record.availability === "missing-port"
    ) {
      return { id: item.id, actual: "negative" as const };
    }
    return { id: item.id, actual: "unknown" as const };
  });
  return {
    schemaVersion: "0.1.0",
    datasetId: manifest.datasetId,
    scannerVersion: "0.0.0",
    rulesSnapshot: "none",
    knowledgeSnapshot: snapshot.snapshotId,
    binding: {
      scope: "replacement-mapping",
      casesSha256: sha256(casesText),
      knowledgeSha256,
    },
    predictions,
  };
}

/** Label-blind 5-way missing-port prediction without OHPM name-absence fallacy. */
export function predictMissingPorts(
  casesText: string,
  snapshotText: string,
  asOf: string,
): Predictions {
  let manifest: MissingPortCases;
  let snapshot;
  try {
    const input = parse(casesText);
    if (!validateMissingPortCases(input)) throw new Error();
    const ids = new Set(input.cases.map(({ id }) => id));
    if (ids.size !== input.cases.length) throw new Error();
    if (!isKnowledgeTimestamp(asOf)) throw new Error();
    manifest = input;
    snapshot = importKnowledge(snapshotText);
  } catch {
    throw new Error("Invalid missing-port prediction inputs.");
  }
  const knowledgeSha256 = sha256(exportKnowledge(snapshot));
  const predictions = manifest.cases.map((item) => {
    if (manifest.target.apiLevel === undefined) {
      return { id: item.id, actual: "unknown" as const };
    }
    const outcome = queryKnowledge(
      snapshot,
      { package: item.package, version: item.version, target: manifest.target },
      asOf,
    );
    if (outcome.matches.length !== 1) {
      return { id: item.id, actual: "unknown" as const };
    }
    const availability = outcome.matches[0]!.availability;
    if (availability === "missing-port") {
      return { id: item.id, actual: "positive" as const };
    }
    if (
      availability === "ohpm-release" ||
      availability === "gitcode-port" ||
      availability === "pure-js"
    ) {
      return { id: item.id, actual: "negative" as const };
    }
    return { id: item.id, actual: "unknown" as const };
  });
  return {
    schemaVersion: "0.1.0",
    datasetId: manifest.datasetId,
    scannerVersion: "0.0.0",
    rulesSnapshot: "none",
    knowledgeSnapshot: snapshot.snapshotId,
    binding: {
      scope: "missing-port",
      casesSha256: sha256(casesText),
      knowledgeSha256,
    },
    predictions,
  };
}
function empty(): Metrics {
  return {
    labeled: 0,
    positive: 0,
    negative: 0,
    tp: 0,
    fp: 0,
    fn: 0,
    tn: 0,
    abstained: 0,
    abstainedPositive: 0,
    abstainedNegative: 0,
    missingPredictions: 0,
    precision: null,
    recall: null,
    accuracy: null,
    coverage: null,
    falsePositiveRate: null,
  };
}
function ratio(n: number, d: number) {
  return d ? n / d : null;
}
function finish(m: Metrics) {
  m.precision = ratio(m.tp, m.tp + m.fp);
  m.recall = ratio(m.tp, m.positive);
  m.accuracy = ratio(m.tp + m.tn, m.labeled);
  m.coverage = ratio(m.labeled - m.abstained, m.labeled);
  m.falsePositiveRate = ratio(m.fp, m.negative);
  return m;
}
const bindingCategories: Record<
  NonNullable<Predictions["binding"]>["scope"],
  string
> = {
  "root-declaration-presence": "root-dependency",
  "dependency-graph": "dependency-graph",
  "incompatible-api": "incompatible-api",
  "replacement-mapping": "replacement-mapping",
  "missing-port": "missing-port",
};
/** Descriptive binary judgments only. No threshold, rubric approval or independent acceptance. */
export function evaluate(labelText: string, predictionText: string) {
  try {
    const labels = parse(labelText);
    const predictions = parse(predictionText);
    if (
      !validateLabels(labels) ||
      !validatePredictions(predictions) ||
      labels.datasetId !== predictions.datasetId ||
      (labels.binding !== undefined &&
        (predictions.binding === undefined ||
          !sameBinding(labels.binding, predictions.binding))) ||
      (predictions.binding &&
        labels.cases.some(
          (item) =>
            item.category !== bindingCategories[predictions.binding!.scope],
        ))
    )
      throw new Error();
    if (Object.values(labels.provenance).some((value) => !value.trim()))
      throw new Error();
    const cases = new Map(labels.cases.map((item) => [item.id, item]));
    const actual = new Map(
      predictions.predictions.map((item) => [item.id, item.actual]),
    );
    if (
      cases.size !== labels.cases.length ||
      actual.size !== predictions.predictions.length ||
      [...actual.keys()].some((key) => !cases.has(key))
    )
      throw new Error();
    const total = empty();
    const categories = new Map<string, Metrics>();
    for (const item of labels.cases) {
      const group = categories.get(item.category) ?? empty();
      categories.set(item.category, group);
      const prediction = actual.get(item.id) ?? "unknown";
      for (const m of [total, group]) {
        m.labeled++;
        if (item.expected === "positive") m.positive++;
        else m.negative++;
        if (!actual.has(item.id)) m.missingPredictions++;
        if (prediction === "unknown") {
          m.abstained++;
          if (item.expected === "positive") {
            m.abstainedPositive++;
            m.fn++;
          } else m.abstainedNegative++;
        } else if (prediction === "positive") {
          if (item.expected === "positive") m.tp++;
          else m.fp++;
        } else if (item.expected === "positive") m.fn++;
        else m.tn++;
      }
    }
    return {
      schemaVersion: "0.1.0" as const,
      datasetId: labels.datasetId,
      origin: labels.origin,
      acceptance: "not-adjudicated" as const,
      independence: "unverified" as const,
      provenance: labels.provenance,
      recordedScanner: {
        version: predictions.scannerVersion,
        rules: predictions.rulesSnapshot,
        knowledge: predictions.knowledgeSnapshot,
        ...(predictions.binding ? { binding: predictions.binding } : {}),
      },
      inputs: {
        labelsSha256: sha256(labelText),
        predictionsSha256: sha256(predictionText),
      },
      total: finish(total),
      categories: Object.fromEntries(
        [...categories]
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([name, m]) => [name, finish(m)]),
      ),
      limitation:
        "Generic binary judgments and declared metadata only. No official threshold, label independence, SDK/runtime validity or replacement equivalence is established.",
    };
  } catch {
    throw new Error("Invalid evaluation inputs.");
  }
}
