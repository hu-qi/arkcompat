/** Version 0.8 is an experimental inventory contract, not a compatibility verdict. */
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
  schemaVersion: "0.8.0";
  scannerVersion: "0.0.0";
  snapshots: { rules: "none"; knowledge: "none" };
  target: TargetProfile;
  dependencies: DeclaredDependency[];
  dependencyGraph: DependencyGraph;
  modules?: OhpmModuleInventory[];
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

export interface OhpmModuleInventory {
  path: string;
  dependencies: DeclaredDependency[];
  dependencyGraph: DependencyGraph;
  coverage: "declarations-only" | "ohpm-lockfile-partial";
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
  /** locked means a recorded location, not a validated range or runtime verdict. */
  resolution: "locked" | "missing" | "unsupported";
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
