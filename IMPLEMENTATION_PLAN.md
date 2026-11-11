## Stage 1: ETS-safe parser boundary
**Goal**: Add `.ets` analysis without changing offsets or accepting silent partial syntax.
**Success Criteria**: `struct` declarations are normalized for TypeScript parsing, and residual ArkUI DSL syntax is recorded as a limitation.
**Tests**: Valid and partially parsed ETS fixtures preserve exact source locations.
**Status**: Complete

## Stage 2: Imported API inventory
**Goal**: Attribute calls only through imported ETS module bindings.
**Success Criteria**: `@ohos`/Kit calls appear in canonical API findings; unbound ArkUI components do not.
**Tests**: Direct, namespace, construct and declaration-call cases plus CLI/core parity.
**Status**: Complete

## Stage 3: Documentation and delivery
**Goal**: Record ETS coverage boundaries and authoritative CI/mirror delivery.
**Success Criteria**: Full local checks, PR/main Actions and three-remote SHA read-backs pass.
**Tests**: `pnpm check`, browser-independent fixture scan, GitHub required checks.
**Status**: In Progress
