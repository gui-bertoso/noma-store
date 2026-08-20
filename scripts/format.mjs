import { readFile, writeFile } from "node:fs/promises";
const files = [
  "admin.html",
  "carrinho.html",
  "checkout.html",
  "index.html",
  "loja.html",
  "produto.html",
  "sobre.html",
  "pages.css",
  "store.js",
];

function formatMarkup(source) {
  return source
    .replace(/>\s*</g, ">\n<")
    .replace(/\n{2,}/g, "\n")
    .replace(/<style>\s*/g, "<style>\n")
    .replace(/\s*<\/style>/g, "\n</style>")
    .replace(/<script( [^>]*)?>\s*/g, (match) => `${match.trim()}\n`)
    .replace(/\s*<\/script>/g, "\n</script>")
    .trim() + "\n";
}

for (const file of files) {
  const source = await readFile(file, "utf8");
  await writeFile(file, file.endsWith(".html") ? formatMarkup(source) : source);
}
