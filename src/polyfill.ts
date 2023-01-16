import ESXToken from "./inline.js";

type TB = typeof import("@babel/template")["default"]

export const getExternalPolyfill = (template: TB) => template.statement.ast`
  import ESXToken from "@ungap/esxtoken";
`;

// Copied from https://github.com/ungap/esxtoken/blob/main/esm/index.js.
// Keep them in sync!
export const getInlinePolyfill = (template: TB) =>
  Object.assign(
    template.statement.ast(ESXToken),
    { _compact: true }
  );
