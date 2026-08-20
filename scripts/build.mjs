import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { extname, join } from "node:path";

const outputDirectory = "dist";
const publicExtensions = new Set([".html", ".css", ".js"]);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of await readdir(".", { withFileTypes: true })) {
  if (entry.isFile() && publicExtensions.has(extname(entry.name))) {
    await cp(entry.name, join(outputDirectory, entry.name));
  }
}

console.log(`Static site generated in ${outputDirectory}/`);
