import { createHash } from "node:crypto";
import { Ajv } from "ajv";
import type { DependencySection, TargetProfile } from "@arkcompat/contracts";

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
  cases: { id: string; category: string; expected: "positive" | "negative" }[];
}
interface Predictions {
  schemaVersion: "0.1.0";
  datasetId: string;
  scannerVersion: string;
  rulesSnapshot: string;
  knowledgeSnapshot: string;
  binding?: {
    scope: "root-declaration-presence";
    casesSha256: string;
    scanReportSha256: string;
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
interface DependencyCases {
  schemaVersion: "0.1.0";
  datasetId: string;
  target: TargetProfile;
  cases: { id: string; section: DependencySection; name: string }[];
}
const validateDependencyCases = ajv.compile<DependencyCases>({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "datasetId", "target", "cases"],
  properties: {
    schemaVersion: { const: "0.1.0" },
    datasetId: id,
    target: {
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
    },
    cases: {
      type: "array",
      maxItems: 10000,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "section", "name"],
        properties: {
          id,
          section: {
            enum: [
              "dependencies",
              "devDependencies",
              "optionalDependencies",
              "peerDependencies",
            ],
          },
          name: {
            type: "string",
            maxLength: 214,
            pattern:
              "^(?:@[A-Za-z0-9][A-Za-z0-9._~-]*\/)?[A-Za-z0-9][A-Za-z0-9._~-]*$",
          },
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
    binding: {
      type: "object",
      additionalProperties: false,
      required: ["scope", "casesSha256", "scanReportSha256"],
      properties: {
        scope: { const: "root-declaration-presence" },
        casesSha256: digest,
        scanReportSha256: digest,
      },
    },
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
/** Descriptive binary judgments only. No threshold, rubric approval or independent acceptance. */
export function evaluate(labelText: string, predictionText: string) {
  try {
    const labels = parse(labelText);
    const predictions = parse(predictionText);
    if (
      !validateLabels(labels) ||
      !validatePredictions(predictions) ||
      labels.datasetId !== predictions.datasetId ||
      (predictions.binding &&
        labels.cases.some((item) => item.category !== "root-dependency"))
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
