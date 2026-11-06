declare module "*validator.mjs" {
  export default function validate(
    data: unknown,
  ): data is import("@arkcompat/contracts").ScanReport;
}
