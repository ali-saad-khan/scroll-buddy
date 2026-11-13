import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { css } from "../src/styles.js";

mkdirSync("dist", { recursive: true });
writeFileSync("dist/scroll-buddy.css", css.trim() + "\n");
await build({ entryPoints: ["src/index.js"], bundle: true, minify: true, format: "cjs", outfile: "dist/scroll-buddy.cjs", target: "es2019" });
await build({ entryPoints: ["src/index.js"], bundle: true, minify: true, format: "iife", globalName: "ScrollBuddy", outfile: "dist/scroll-buddy.iife.js", target: "es2019" });
console.log("built dist/");
