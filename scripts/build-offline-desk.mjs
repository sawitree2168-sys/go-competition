// Bundles the offline pairing desk (offline/desk.mjs + the website's pairing engine) into one script,
// public/offline/desk.js, which the organiser page puts inside the downloadable HTML file.
import { build } from "esbuild";
await build({
  entryPoints: ["offline/desk.mjs"], bundle: true, format: "iife", minify: true, target: ["chrome90", "safari14", "firefox90"],
  outfile: "public/offline/desk.js", legalComments: "none",
});
console.log("offline desk → public/offline/desk.js");
