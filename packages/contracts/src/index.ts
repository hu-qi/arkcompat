/** Version 0.1 is an experimental inventory contract, not a compatibility verdict. */
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
  kind: "import" | "export" | "dynamic-import";
  specifier: string | null;
  location: SourceLocation;
}
export interface Finding {
  id: string;
  ruleId: "inventory.dependency" | "inventory.module-reference";
  status: "unknown";
  tier: "rule-static";
  severity: "info";
  target: TargetProfile;
  location: SourceLocation;
  evidence: {
    kind: "manifest-declaration" | "ast-module-reference";
    value: string | null;
  }[];
  explanation: string;
}
export interface Limitation {
  code: string;
  path?: string;
}
export interface ScanReport {
  schemaVersion: "0.1.0";
  scannerVersion: "0.0.0";
  snapshots: { rules: "none"; knowledge: "none" };
  target: TargetProfile;
  dependencies: DeclaredDependency[];
  references: ModuleReference[];
  findings: Finding[];
  coverage: {
    dependencyGraph: "declarations-only";
    compatibility: "not-evaluated";
    sourceFiles: number;
    limitations: Limitation[];
  };
}
