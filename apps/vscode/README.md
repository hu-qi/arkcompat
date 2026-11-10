# ArkCompat Local Inventory

1. Open one local workspace in VS Code.
2. In **User** settings, set `arkcompat.nodePath` to the absolute path of a trusted Node 22.13+ (22.x) or Node 24 executable.
3. Run **ArkCompat: Scan Local Workspace** from the command palette. Open **Problems** to see source locations for the inventory findings.

The scan is local and does not execute workspace scripts. Results inventory dependencies and API references; their compatibility status is `unknown`. The extension is a development preview.
