import fs from "fs";
import path from "path";
import postcss from "postcss";

const stage = path.resolve(process.argv[2] || "");
if (!stage || !fs.existsSync(path.join(stage, "css"))) {
  console.error("usage: node tools/minify-release-css.mjs <stage-dir>");
  process.exit(1);
}

function tidy(text) {
  return text.replace(/\s+/g, " ").trim();
}

function shape(root) {
  const out = [];
  root.walk((node) => {
    if (node.type === "rule") out.push("r:" + node.selectors.map(tidy).join(","));
    else if (node.type === "decl") out.push("d:" + node.prop + ":" + tidy(node.value) + (node.important ? "!" : ""));
    else if (node.type === "atrule") out.push("a:" + node.name + " " + tidy(node.params));
  });
  return out.join("\n");
}

function minify(text, name) {
  const root = postcss.parse(text);
  const before = shape(root);
  root.walkComments((c) => c.remove());
  root.walk((node) => {
    node.raws.before = "";
    node.raws.after = "";
    node.raws.between = "";
    node.raws.semicolon = false;
    if (node.type === "decl") {
      node.raws.between = ":";
      if (node.important) node.raws.important = "!important";
    } else if (node.type === "rule") {
      node.selector = node.selectors.map(tidy).join(",");
    } else if (node.type === "atrule") {
      node.raws.afterName = node.params ? " " : "";
    }
  });
  root.raws.after = "";
  const out = root.toString();
  if (shape(postcss.parse(out)) !== before) throw new Error(name + ": minified stylesheet no longer has the same rules");
  return out;
}

let saved = 0;
for (const name of fs.readdirSync(path.join(stage, "css"))) {
  if (!name.endsWith(".css")) continue;
  const full = path.join(stage, "css", name);
  const text = fs.readFileSync(full, "utf8");
  const out = minify(text, name);
  saved += text.length - out.length;
  fs.writeFileSync(full, out);
}
console.log("minified release stylesheets, " + saved + " bytes smaller");
