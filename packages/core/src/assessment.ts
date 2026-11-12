import { createHash } from "node:crypto";
import type {
  ApiAssessment,
  AssessmentReport,
  DependencyAssessment,
  DependencyGraph,
  KnowledgeRecord,
  ScanReport,
  SourceLocation,
  TargetProfile,
} from "@arkcompat/contracts";
import { evaluateApiRules } from "./api-rules.js";

export interface KnowledgeQueryOutcome {
  status: "unknown";
  snapshotId: string;
  contentHash: string;
  totalRecords: number;
  consideredRecords: number;
  matches: KnowledgeRecord[];
  excluded: { id: string; reasons: string[] }[];
  limitation: string;
}

export interface KnowledgeQueryProvider {
  query(request: {
    package: string;
    version: string;
    target: TargetProfile;
  }): KnowledgeQueryOutcome;
  snapshotInfo?(): { id: string; sha256: string };
}

export interface AssessReportOptions {
  rulesText?: string;
  knowledge?: KnowledgeQueryProvider;
  asOf?: string;
}

const exactSemver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function resolveModuleVersions(
  declarations: ScanReport["dependencies"],
  graph: DependencyGraph,
): Map<string, string | null> {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const resolved = new Map<string, string | null>();
  for (const dep of declarations) {
    const key = JSON.stringify([dep.section, dep.name]);
    const edge = graph.edges.find(
      (item) =>
        item.from === "" &&
        item.section === dep.section &&
        item.name === dep.name &&
        item.specifier === dep.specifier,
    );
    const nodeVersion =
      edge?.resolution === "locked" && edge.to
        ? (nodes.get(edge.to)?.version ?? null)
        : null;
    if (nodeVersion && exactSemver.test(nodeVersion)) {
      resolved.set(key, nodeVersion);
    } else if (exactSemver.test(dep.specifier)) {
      resolved.set(key, dep.specifier);
    } else {
      resolved.set(key, null);
    }
  }
  return resolved;
}

function findDependencyLocation(
  report: ScanReport,
  modulePath: string,
  dep: ScanReport["dependencies"][number],
): SourceLocation | null {
  const expectedFile =
    modulePath === "."
      ? ["package.json", "oh-package.json5"]
      : [`${modulePath}/package.json`, `${modulePath}/oh-package.json5`];
  for (const finding of report.findings) {
    if (finding.ruleId !== "inventory.dependency") continue;
    if (!expectedFile.includes(finding.location.path)) continue;
    if (finding.evidence[0]?.value !== dep.name) continue;
    const expectedFindingId = createHash("sha256")
      .update(
        JSON.stringify([
          "inventory.dependency",
          finding.location,
          JSON.stringify(dep),
        ]),
      )
      .digest("hex");
    if (finding.id === expectedFindingId) {
      return finding.location;
    }
  }
  return null;
}

function buildDependencyAssessment(
  modulePath: string,
  dep: ScanReport["dependencies"][number],
  resolvedVersion: string | null,
  location: SourceLocation | null,
  target: TargetProfile,
  knowledge?: KnowledgeQueryProvider,
): {
  assessment: DependencyAssessment;
  snapshot?: { id: string; sha256: string };
} {
  if (!knowledge) {
    return {
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: "unknown",
        classification: "unknown",
        replacement: null,
        excludedRecordReasons: [],
        location,
        recommendedAction:
          "Supply a validated knowledge snapshot and exact target profile to evaluate reviewed replacements or port availability.",
      },
    };
  }
  if (target.apiLevel === undefined) {
    return {
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: "unknown",
        classification: "unknown",
        replacement: null,
        excludedRecordReasons: [
          { id: "(query-precondition)", reasons: ["missing-api-level"] },
        ],
        location,
        recommendedAction:
          "Provide an explicit integer --api-level (e.g. 20 for HarmonyOS 6.0.0) before querying reviewed package records.",
      },
    };
  }
  if (resolvedVersion === null) {
    return {
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion: null,
        availability: "unknown",
        classification: "unknown",
        replacement: null,
        excludedRecordReasons: [
          { id: "(query-precondition)", reasons: ["unresolved-exact-version"] },
        ],
        location,
        recommendedAction:
          "Generate or supply a supported lockfile so an exact resolved package version can be checked against reviewed records.",
      },
    };
  }
  const outcome = knowledge.query({
    package: dep.name,
    version: resolvedVersion,
    target,
  });
  const snapshot = { id: outcome.snapshotId, sha256: outcome.contentHash };
  if (outcome.matches.length !== 1) {
    return {
      snapshot,
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: "unknown",
        classification: "unknown",
        replacement: null,
        excludedRecordReasons: outcome.excluded,
        location,
        recommendedAction: outcome.excluded.length
          ? "No active reviewed record matched this version and target profile; inspect excluded reasons before adopting any candidate."
          : "No verified record exists for this package; do not infer a missing port solely from OHPM name absence.",
      },
    };
  }
  const record = outcome.matches[0]!;
  if (record.review.state !== "reviewed") {
    return {
      snapshot,
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: "unknown",
        classification: "unknown",
        replacement: null,
        excludedRecordReasons: [{ id: record.id, reasons: ["not-reviewed"] }],
        location,
        recommendedAction:
          "Candidate record has not passed independent review; keep unpromoted until reviewed.",
      },
    };
  }
  if (
    (record.availability === "ohpm-release" ||
      record.availability === "gitcode-port") &&
    record.target !== null &&
    (record.relation === "full" || record.relation === "partial")
  ) {
    const partialNote =
      record.relation === "partial"
        ? ` Partial equivalence only; excluded features: ${record.features.excluded.join(", ")}.`
        : "";
    return {
      snapshot,
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: record.availability,
        classification: "recommended-substitute",
        replacement: {
          mappingId: record.id,
          registry: record.target.registry,
          name: record.target.name,
          versionRange: record.target.versionRange,
          relation: record.relation,
          includedFeatures: [...record.features.included],
          excludedFeatures: [...record.features.excluded],
          reviewer: record.review.reviewer,
          reviewedAt: record.review.reviewedAt,
          provenanceUrls: record.provenance.map((p) => p.url),
        },
        excludedRecordReasons: outcome.excluded,
        location,
        recommendedAction: `Evaluate reviewed ${record.target.registry} substitute ${record.target.name} (${record.target.versionRange}) for ${target.os} ${target.release} (${target.runtime}, API ${target.apiLevel}).${partialNote}`,
      },
    };
  }
  if (record.availability === "pure-js") {
    return {
      snapshot,
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: "pure-js",
        classification: "pure-js-usable",
        replacement: null,
        excludedRecordReasons: outcome.excluded,
        location,
        recommendedAction: `Reviewed as pure-JS usable (${record.relation}) on ${target.runtime}; verify excluded features (${record.features.excluded.join(", ") || "none"}) against application usage.`,
      },
    };
  }
  if (record.availability === "missing-port") {
    return {
      snapshot,
      assessment: {
        modulePath,
        name: dep.name,
        section: dep.section,
        specifier: dep.specifier,
        resolvedVersion,
        availability: "missing-port",
        classification: "missing-port",
        replacement: null,
        excludedRecordReasons: outcome.excluded,
        location,
        recommendedAction:
          "Reviewed missing HarmonyOS port; no verified OHPM or GitCode substitute is available. Plan native adaptation or alternative architecture.",
      },
    };
  }
  return {
    snapshot,
    assessment: {
      modulePath,
      name: dep.name,
      section: dep.section,
      specifier: dep.specifier,
      resolvedVersion,
      availability: "unknown",
      classification: "unknown",
      replacement: null,
      excludedRecordReasons: outcome.excluded,
      location,
      recommendedAction:
        "Compatibility remains unknown in the reviewed knowledge record.",
    },
  };
}

/** Pure advisory projection combining scan inventory, API rules, and reviewed knowledge. */
export function assessReport(
  report: ScanReport,
  options: AssessReportOptions = {},
): AssessmentReport {
  if (options.knowledge && !options.asOf) {
    throw new Error(
      "Knowledge assessment requires an explicit UTC asOf timestamp.",
    );
  }
  const dependencies: DependencyAssessment[] = [];
  const initialKnowledgeInfo = options.knowledge?.snapshotInfo?.();
  let knowledgeSnapshot: { id: string; sha256: string; asOf: string } | "none" =
    initialKnowledgeInfo
      ? { ...initialKnowledgeInfo, asOf: options.asOf! }
      : "none";

  const moduleScopes = [
    {
      modulePath: ".",
      declarations: report.dependencies,
      graph: report.dependencyGraph,
    },
    ...(report.modules ?? []).map((mod) => ({
      modulePath: mod.path,
      declarations: mod.dependencies,
      graph: mod.dependencyGraph,
    })),
  ];
  for (const scope of moduleScopes) {
    const versions = resolveModuleVersions(scope.declarations, scope.graph);
    for (const dep of scope.declarations) {
      const resolvedVersion =
        versions.get(JSON.stringify([dep.section, dep.name])) ?? null;
      const location = findDependencyLocation(report, scope.modulePath, dep);
      const { assessment, snapshot } = buildDependencyAssessment(
        scope.modulePath,
        dep,
        resolvedVersion,
        location,
        report.target,
        options.knowledge,
      );
      if (snapshot && knowledgeSnapshot === "none") {
        knowledgeSnapshot = { ...snapshot, asOf: options.asOf! };
      }
      dependencies.push(assessment);
    }
  }

  let rulesSnapshot: { id: string; sha256: string } | "none" = "none";
  let apiAssessments: ApiAssessment[];
  if (options.rulesText !== undefined) {
    const evaluated = evaluateApiRules(report, options.rulesText);
    rulesSnapshot = evaluated.snapshot;
    apiAssessments = evaluated.results.map((item) => {
      if (item.status === "unknown") {
        return {
          location: item.usage.location,
          module: item.usage.module,
          path: item.usage.path,
          kind: item.usage.kind,
          optional: item.usage.optional,
          status: "unknown",
          reason: item.reason,
          recommendedAction:
            item.reason === "missing-api-level"
              ? "Supply an explicit --api-level to evaluate target-aware API rules."
              : item.reason === "ambiguous-rule"
                ? "Multiple equal-priority rules matched this call; inspect rule definitions before modifying code."
                : "No rule matched this API call in the selected snapshot; verify against target HarmonyOS SDK documentation.",
        };
      }
      if ("rationale" in item) {
        return {
          location: item.usage.location,
          module: item.usage.module,
          path: item.usage.path,
          kind: item.usage.kind,
          optional: item.usage.optional,
          status: item.status,
          ruleId: item.ruleId,
          severity: item.severity,
          rationale: item.rationale,
          recommendedAction: item.recommendedAction,
          source: item.source,
        };
      }
      return {
        location: item.usage.location,
        module: item.usage.module,
        path: item.usage.path,
        kind: item.usage.kind,
        optional: item.usage.optional,
        status: item.status,
        ruleId: item.ruleId,
        recommendedAction:
          "Verify this static potential-risk call site against target HarmonyOS SDK documentation.",
        source: item.source,
      };
    });
  } else {
    apiAssessments = report.apiUsages.map((usage) => ({
      location: usage.location,
      module: usage.module,
      path: usage.path,
      kind: usage.kind,
      optional: usage.optional,
      status: "unknown",
      reason: "no-rules-snapshot",
      recommendedAction:
        "Supply an explicit --rules snapshot to evaluate observed API calls against HarmonyOS target rules.",
    }));
  }

  return {
    schemaVersion: "0.1.0",
    scannerVersion: report.scannerVersion,
    target: report.target,
    snapshots: {
      rules: rulesSnapshot,
      knowledge: knowledgeSnapshot,
    },
    dependencies,
    apiAssessments,
    summary: {
      dependencies: {
        total: dependencies.length,
        ohpmRelease: dependencies.filter(
          (d) => d.availability === "ohpm-release",
        ).length,
        gitcodePort: dependencies.filter(
          (d) => d.availability === "gitcode-port",
        ).length,
        pureJs: dependencies.filter((d) => d.availability === "pure-js").length,
        missingPort: dependencies.filter(
          (d) => d.availability === "missing-port",
        ).length,
        unknown: dependencies.filter((d) => d.availability === "unknown")
          .length,
        recommendedSubstitutes: dependencies.filter(
          (d) => d.classification === "recommended-substitute",
        ).length,
      },
      apis: {
        total: apiAssessments.length,
        incompatible: apiAssessments.filter((a) => a.status === "incompatible")
          .length,
        conditional: apiAssessments.filter((a) => a.status === "conditional")
          .length,
        potentialRisk: apiAssessments.filter(
          (a) => a.status === "potential-risk",
        ).length,
        unknown: apiAssessments.filter((a) => a.status === "unknown").length,
      },
    },
    limitations: report.coverage.limitations,
  };
}
