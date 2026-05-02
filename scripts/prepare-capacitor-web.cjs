const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.join(root, "www");

const files = [
  "index.html",
  "style.css",
  "supabase.js",
  "_config.yml"
];

const dirs = ["js", "assets"];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(outDir, file));
  }
}

for (const dir of dirs) {
  const source = path.join(root, dir);
  if (fs.existsSync(source)) {
    copyDir(source, path.join(outDir, dir));
  }
}

console.log("Capacitor web assets prepared in www/");

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}
