import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const layoutPath = path.join(root, "app", "layout.tsx");
const cssPath = path.join(root, "app", "white-label.css");

if (!fs.existsSync(layoutPath)) {
  console.error("ERRO: app/layout.tsx não encontrado. Execute este comando na raiz do projeto.");
  process.exit(1);
}

if (!fs.existsSync(cssPath)) {
  console.error("ERRO: app/white-label.css não encontrado.");
  process.exit(1);
}

let layout = fs.readFileSync(layoutPath, "utf8");

if (layout.includes('white-label.css')) {
  console.log("White label já está importado em app/layout.tsx. Nada para alterar.");
  process.exit(0);
}

const backupPath = layoutPath + ".backup-white-label";
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, layout, "utf8");
  console.log("Backup criado:", path.relative(root, backupPath));
}

const globalsRegex = /import\s+["']\.\/globals\.css["'];?\s*/;

if (globalsRegex.test(layout)) {
  layout = layout.replace(
    globalsRegex,
    (match) => `${match}import "./white-label.css";\n`
  );
} else {
  layout = `import "./white-label.css";\n${layout}`;
}

fs.writeFileSync(layoutPath, layout, "utf8");

console.log("");
console.log("WHITE LABEL APLICADO COM SUCESSO");
console.log("- app/white-label.css");
console.log("- app/layout.tsx recebeu o import");
console.log("- nenhuma regra de negócio foi alterada");
console.log("- nenhum SQL é necessário");
