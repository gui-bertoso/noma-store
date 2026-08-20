import { readFile, writeFile } from "node:fs/promises";

const files = [
  "admin.html",
  "carrinho.html",
  "checkout.html",
  "index.html",
  "loja.html",
  "produto.html",
  "sobre.html",
];
const voidTags = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  let level = 0;
  const output = lines.map((line) => {
    const text = line.trim();
    if (!text) return "";
    if (/^<\//.test(text)) level = Math.max(0, level - 1);
    const result = `${"  ".repeat(level)}${text}`;
    const opens = [...text.matchAll(/<([a-z][\w-]*)\b[^>]*>/gi)]
      .filter((match) => !match[0].startsWith("</") && !match[0].endsWith("/>") && !voidTags.test(match[1]))
      .length;
    const closes = (text.match(/<\//g) || []).length;
    level += Math.max(0, opens - closes);
    return result;
  });
  await writeFile(file, `${output.join("\n").replace(/\n+$/, "")}\n`);
}
