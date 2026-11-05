# Knowledge metadata contract · M2 / Issue #4

Experimental **knowledge schema 0.1.0** is separate from scan-report schema 0.5.0. [JSON schema](../packages/contracts/knowledge.schema.json) and KnowledgeSnapshot/KnowledgeRecord TypeScript declarations define metadata for future reviewed adapters. This is a contract foundation, not a delivered replacement KB or a verified mapping.

## Explicit record boundaries

Each record requires source/target version selectors, runtime/release/API context, included/excluded features, source version/date/license/URL evidence, review attribution and validity date. Availability distinguishes OHPM publication, GitCode port, pure-JS use, missing port and unknown; it does not infer that absence of an OHPM name establishes a missing port.

- OHPM/GitCode records require the matching target registry and full/partial relationship.
- Unknown records have no target and an unknown relationship; missing-port records have no target and no relationship. Pure-JS use has no replacement target.
- Partial relationships require both included features and explicit exclusions. Full relationships still require a named feature scope.
- Candidate state has no reviewer/date. Reviewed metadata requires both; the schema cannot authenticate a reviewer, approve reuse, or verify a source claim.
- Provenance requires at least one explicit versioned source/license record. HTTPS URL shape excludes userinfo, query parameters and fragments to avoid embedding credentials/signed links; no network lookup occurs.
- Arbitrary confidence/verifiedCompatible fields are rejected. A structurally valid reviewed record is **not** a verified compatibility decision.

## Fixture and validation

The only added snapshot is [the authored developer fixture](../fixtures/developer/knowledge/snapshot.json): **one synthetic partial candidate, zero real or verified recommendations**. Its example.invalid evidence URL and LicenseRef-DeveloperFixture are deliberate placeholders and do not describe real libraries, SDK behavior or permissions for external data.

Twenty-two schema/regression cases cover required fields, provenance/version/partial-scope rejection, review promotion, URL safety, all availability states, false confidence assertions, empty snapshots, historical expiry metadata and the fixture. AJV runs offline in the existing test suite. A scanner regression confirms this fixture is not loaded: scan snapshots remain rules/knowledge none, all conclusions unknown.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm exec vitest run tests/knowledge-contract.test.ts
```

## Semantic gates intentionally still open

UTC timestamp strings have a shape constraint, not complete calendar validation. Version selector strings are required but semver satisfaction/intersection is not implemented. Arrays reject identical duplicate records; cross-record ID uniqueness/conflicts need a future semantic importer. Historical expiry is retained as data, not filtered or renewed by structural validation. Future consumers must reject stale/conflicting/inapplicable records before recommendation; no current recommendation path reads this schema.

Source licensing/rights, reviewer authenticity, evidence validity, feature equivalence, runtime/build verification and independent holdout adjudication require separate review. No real Huawei/official compatibility dataset has been imported and no repository license chosen. Actual sourced adapters, refresh/import policy, semantic selection/export and independent benchmark remain #4 work; target-aware engine remains #3 and acceptance #7/#8.

Revert this scoped contract PR to remove the metadata schema/types/fixture. The scanner's JSON schema, engine and unknown-only behavior need no migration. There is no published knowledge release.
