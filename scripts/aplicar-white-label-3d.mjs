import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const layoutPath = path.join(root, "app", "layout.tsx");
const cssPath = path.join(root, "app", "white-label-3d.css");

if (!fs.existsSync(layoutPath)) {
  console.error("ERRO: app/layout.tsx não encontrado.");
  process.exit(1);
}

if (!fs.existsSync(cssPath)) {
  console.error("ERRO: app/white-label-3d.css não encontrado.");
  process.exit(1);
}

let layout = fs.readFileSync(layoutPath, "utf8");

if (layout.includes('white-label-3d.css')) {
  console.log("Efeito 3D já aplicado. Nada para alterar.");
  process.exit(0);
}

const importLine = 'import "./white-label-3d.css";\n';

if (layout.includes('import "./white-label.css";')) {
  layout = layout.replace(
    'import "./white-label.css";',
    'import "./white-label.css";\nimport "./white-label-3d.css";'
  );
} else {
  layout = importLine + layout;
}

fs.writeFileSync(layoutPath, layout, "utf8");

console.log("");
console.log("EFEITO 3D APLICADO COM SUCESSO");
console.log("- cards com profundidade");
console.log("- menu lateral com botões 3D");
console.log("- botões principais com relevo");
console.log("- login com card elevado");
console.log("- nenhuma regra de negócio alterada");
