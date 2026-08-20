import { readFile, writeFile } from "node:fs/promises";

const file = "index.html";
let html = await readFile(file, "utf8");

const style = html.match(/<style>\n([\s\S]*?)\n<\/style>/);
const script = html.match(/<script>\n([\s\S]*?)\n<\/script>\n<\/body>/);

if (!style || !script) throw new Error("Inline style/script not found");

await writeFile("home.css", `${style[1].trim()}\n`);
await writeFile("home.js", `${script[1].trim()}\n`);

html = html.replace(style[0], '<link rel="stylesheet" href="home.css">');
html = html.replace(script[0], '<script src="home.js"></script>\n</body>');
await writeFile(file, html);
