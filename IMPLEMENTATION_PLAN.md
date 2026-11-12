## Stage 1: Audit the planning documents

**Goal**: Compare the master TODO, execution ledger, completion plan, sign-off
package, delivery status, README, and temporary checklist.

**Success Criteria**: All eight open Issues have explicit engineering actions,
close conditions, dependencies, evidence, and accountable roles; stale status is
identified.

**Tests**: Cross-check open Issues with the ledger; compare recorded baselines
with Git and GitHub Actions.

**Status**: Complete

## Stage 2: Reconcile one verified baseline

**Goal**: Make every planning entry point distinguish the latest verified main
commit from the latest full code-regression baseline.

**Success Criteria**: README, TODO, master TODO, execution ledger, completion
plan, delivery status, and sign-off package agree on `38b725a`, main run
`43182839402`, and regression baseline `f5d878d`.

**Tests**: Search for superseded baseline SHAs and run documentation integrity.

**Status**: Complete

## Stage 3: Correct executable status and close conditions

**Goal**: Ensure READY work can start without human input and GATED work names the
missing decision or external input.

**Success Criteria**: Master TODO and ledger agree on the five READY tasks, Issue
close conditions, human gates, formal metrics, release sequence, and the rule
that CI or model review cannot establish acceptance.

**Tests**: Compare each open Issue's original body with its ledger row and
validate every local link.

**Status**: Complete

## Stage 4: Verify and publish the documentation

**Goal**: Run the repository quality gate, merge the documentation correction,
and synchronize GitHub with AtomGit.

**Success Criteria**: `pnpm check` and all five required PR/main jobs pass; the
merged main SHA is identical on GitHub and AtomGit.

**Tests**: Full `pnpm check`; PR checks; post-merge main checks; two independent
`git ls-remote` reads.

**Status**: In Progress
