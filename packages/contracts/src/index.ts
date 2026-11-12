/** Version 0.10 is an experimental inventory contract, not a compatibility verdict. */
export interface TargetProfile {
  os: "HarmonyOS";
  release: string;
  runtime: "arkts" | "arkweb" | "react-native";
  apiLevel?: number;
}
export type DependencySection =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";
export interface SourceLocation {
  path: string;
  line: number;
  column: number;
}
export interface DeclaredDependency {
  name: string;
  specifier: string;
  section: DependencySection;
  status: "unknown";
}
export interface ModuleReference {
  kind:
    | "import"
    | "export"
    | "dynamic-import"
    | "require"
    | "import-equals"
    | "import-type";
  specifier: string | null;
  location: SourceLocation;
}
export interface Finding {
  id: string;
  ruleId:
    | "inventory.dependency"
    | "inventory.module-reference"
    | "inventory.api-usage";
  status: "unknown";
  tier: "rule-static";
  severity: "info";
  target: TargetProfile;
  location: SourceLocation;
  evidence: {
    kind: "manifest-declaration" | "ast-module-reference" | "module-api-access";
    value: string | null;
  }[];
  explanation: string;
}
export interface Limitation {
  code: string;
  path?: string;
}
export interface ScanReport {
  schemaVersion: "0.12.0";
  scannerVersion: "0.0.0";
  snapshots: { rules: "none"; knowledge: "none" };
  target: TargetProfile;
  dependencies: DeclaredDependency[];
  dependencyGraph: DependencyGraph;
  modules?: ModuleInventory[];
  references: ModuleReference[];
  apiUsages: ApiUsage[];
  findings: Finding[];
  coverage: {
    dependencyGraph:
      | "declarations-only"
      | "npm-lockfile-partial"
      | "pnpm-lockfile-partial"
      | "yarn-classic-lockfile-partial"
      | "yarn-berry-lockfile-partial"
      | "ohpm-lockfile-partial";
    compatibility: "not-evaluated";
    sourceFiles: number;
    limitations: Limitation[];
  };
}

/** Deterministic explanation of an inventory finding; never a compatibility verdict. */
export interface FindingExplanation {
  explanationVersion: "0.1.0";
  finding: Finding;
  source: SourceLocation;
  target: TargetProfile;
  rule: {
    id: Finding["ruleId"];
    status: Finding["status"];
    tier: Finding["tier"];
    severity: Finding["severity"];
  };
  evidence: Finding["evidence"];
  explanation: string;
  limitations: Limitation[];
  recommendedAction: {
    code:
      | "verify-reviewed-package-evidence"
      | "verify-reviewed-module-evidence"
      | "verify-reviewed-api-evidence";
    text: string;
    compatibilityClaim: false;
    evidenceRequired: true;
  };
  snapshots: ScanReport["snapshots"];
}

export type ModuleInventory =
  | OhpmModuleInventory
  | NpmModuleInventory
  | PnpmModuleInventory
  | YarnModuleInventory;

interface ModuleInventoryBase {
  path: string;
  dependencies: DeclaredDependency[];
  dependencyGraph: DependencyGraph;
}

export interface OhpmModuleInventory extends ModuleInventoryBase {
  kind: "ohpm";
  coverage: "declarations-only" | "ohpm-lockfile-partial";
}

export interface NpmModuleInventory extends ModuleInventoryBase {
  kind: "npm";
  coverage: "declarations-only" | "npm-lockfile-partial";
}

export interface PnpmModuleInventory extends ModuleInventoryBase {
  kind: "pnpm";
  coverage: "declarations-only" | "pnpm-lockfile-partial";
}

export interface YarnModuleInventory extends ModuleInventoryBase {
  kind: "yarn";
  coverage:
    | "declarations-only"
    | "yarn-classic-lockfile-partial"
    | "yarn-berry-lockfile-partial";
}

export interface LockedPackage {
  id: string;
  installName: string;
  name: string;
  version: string | null;
  link: boolean;
}
export interface DependencyEdge {
  /** Empty from denotes the root project; other IDs are lockfile locations. */
  from: string;
  name: string;
  specifier: string;
  section: DependencySection;
  to: string | null;
  /**
   * locked means a recorded location with a satisfied standard semver range
   * when one is present. mismatch keeps the recorded target visible.
   */
  resolution: "locked" | "mismatch" | "missing" | "unsupported";
}
export interface DependencyGraph {
  source:
    | "package-lock.json"
    | "npm-shrinkwrap.json"
    | "pnpm-lock.yaml"
    | "yarn.lock"
    | "oh-package-lock.json5"
    | null;
  lockfileVersion: number | null;
  nodes: LockedPackage[];
  edges: DependencyEdge[];
}

/** Observed call syntax through an imported binding; no runtime or export verification. */
export interface ApiUsage {
  module: string;
  path: string[];
  kind: "call" | "construct";
  optional: boolean;
  location: SourceLocation;
}

/** Experimental metadata only; schema/review state cannot establish compatibility. */
export interface KnowledgeSnapshot {
  schemaVersion: "0.1.0";
  snapshotId: string;
  generatedAt: string;
  records: KnowledgeRecord[];
}
export interface KnowledgeRecord {
  id: string;
  source: { name: string; versionRange: string };
  target: {
    registry: "ohpm" | "gitcode" | "npm";
    name: string;
    versionRange: string;
  } | null;
  availability:
    "ohpm-release" | "gitcode-port" | "pure-js" | "missing-port" | "unknown";
  relation: "full" | "partial" | "none" | "unknown";
  profile: {
    os: "HarmonyOS";
    releaseRange: string;
    apiLevel: number;
    runtime: "arkts" | "arkweb" | "react-native" | "unknown";
  };
  features: { included: string[]; excluded: string[] };
  provenance: {
    url: string;
    license: string;
    sourceVersion: string;
    retrievedAt: string;
  }[];
  review:
    | { state: "candidate"; reviewer: null; reviewedAt: null }
    | { state: "reviewed"; reviewer: string; reviewedAt: string };
  validUntil: string;
}

/** Advisory assessment report binding scan inventory, static rules, and reviewed knowledge. */
export interface DependencyAssessment {
  modulePath: string;
  name: string;
  section: DependencySection;
  specifier: string;
  resolvedVersion: string | null;
  availability:
    "ohpm-release" | "gitcode-port" | "pure-js" | "missing-port" | "unknown";
  classification:
    "recommended-substitute" | "pure-js-usable" | "missing-port" | "unknown";
  replacement: {
    mappingId: string;
    registry: "ohpm" | "gitcode" | "npm";
    name: string;
    versionRange: string;
    relation: "full" | "partial";
    includedFeatures: string[];
    excludedFeatures: string[];
    reviewer: string;
    reviewedAt: string;
    provenanceUrls: string[];
  } | null;
  excludedRecordReasons: { id: string; reasons: string[] }[];
  location: SourceLocation | null;
  recommendedAction: string;
}

export interface ApiAssessment {
  location: SourceLocation;
  module: string;
  path: string[];
  kind: "call" | "construct";
  optional: boolean;
  status: "incompatible" | "conditional" | "potential-risk" | "unknown";
  reason?:
    | "missing-api-level"
    | "no-exact-rule"
    | "ambiguous-rule"
    | "no-rules-snapshot";
  ruleId?: string;
  severity?: "critical" | "high" | "medium" | "low";
  rationale?: string;
  recommendedAction: string;
  source?: { url: string; revision: string; title?: string };
}

export interface AssessmentReport {
  schemaVersion: "0.1.0";
  scannerVersion: "0.0.0";
  target: TargetProfile;
  snapshots: {
    rules: { id: string; sha256: string } | "none";
    knowledge: { id: string; sha256: string; asOf: string } | "none";
  };
  dependencies: DependencyAssessment[];
  apiAssessments: ApiAssessment[];
  summary: {
    dependencies: {
      total: number;
      ohpmRelease: number;
      gitcodePort: number;
      pureJs: number;
      missingPort: number;
      unknown: number;
      recommendedSubstitutes: number;
    };
    apis: {
      total: number;
      incompatible: number;
      conditional: number;
      potentialRisk: number;
      unknown: number;
    };
  };
  limitations: Limitation[];
}
