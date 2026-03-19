import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    pure: "./src/pure.tsx",
  },
  outDir: "./dist",
  platform: "neutral",
  dts: true,
  sourcemap: true,
  nodeProtocol: true,
  attw: { profile: "esm-only" },
  publint: true,
  format: "esm",
  exports: {
    devExports: true,
  },
});
