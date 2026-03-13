import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  splitting: false,
  outDir: "dist",
  clean: true,
  noExternal: [/@packages\/.*/],
});
