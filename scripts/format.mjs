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
  const css = (value) => value
    .replace(/\s*{\s*/g, " {\n  ")
    .replace(/;\s*/g, ";\n  ")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\n  \n/g, "\n")
    .trim();

  return source
    .replace(/>\s*</g, ">\n<")
    .replace(/\n{2,}/g, "\n")
    .replace(/<style>\s*/g, "<style>\n")
    .replace(/\s*<\/style>/g, "\n</style>")
    .replace(/<style>([\s\S]*?)<\/style>/g, (_, value) => `<style>\n${css(value)}\n</style>`)
    .replace(/<script( [^>]*)?>\s*/g, (match) => `${match.trim()}\n`)
    .replace(/\s*<\/script>/g, "\n</script>")
    .trim() + "\n";
}

for (const file of files) {
  const source = await readFile(file, "utf8");
  await writeFile(file, file.endsWith(".html") ? formatMarkup(source) : source);
}
