const traverseModule = require("@babel/traverse");
const traverse = traverseModule.default || traverseModule;

/**
 * Walks a Babel AST and finds TypeScript interface/abstract-class
 * declarations, plus every class that `implements` or `extends` one -
 * the "who realizes this interface" relationship a DI container usually
 * hides (an interface is declared once, several unrelated classes
 * implement it, and something elsewhere wires the right one in).
 *
 * Returns:
 *   declarations:   [{ name, kind: "interface" | "abstract-class" }]
 *   implementations: [{ className, interfaceName, relation: "implements" | "extends" }]
 */
function extractInterfaces(ast) {
  const declarations = [];
  const implementations = [];

  const nameOfExpr = (expr) => {
    if (!expr) return null;
    if (expr.type === "Identifier") return expr.name;
    if (expr.type === "TSQualifiedName" && expr.right) return expr.right.name;
    return null;
  };

  traverse(ast, {
    TSInterfaceDeclaration(path) {
      const node = path.node;
      if (!node.id) return;
      declarations.push({ name: node.id.name, kind: "interface" });

      (node.extends || []).forEach((ext) => {
        const name = nameOfExpr(ext.expression);
        if (name) implementations.push({ className: node.id.name, interfaceName: name, relation: "extends" });
      });
    },

    ClassDeclaration(path) {
      const node = path.node;
      if (!node.id) return;
      const className = node.id.name;

      if (node.abstract) {
        declarations.push({ name: className, kind: "abstract-class" });
      }

      (node.implements || []).forEach((impl) => {
        const name = nameOfExpr(impl.expression);
        if (name) implementations.push({ className, interfaceName: name, relation: "implements" });
      });

      if (node.superClass && node.superClass.type === "Identifier") {
        implementations.push({ className, interfaceName: node.superClass.name, relation: "extends" });
      }
    },
  });

  return { declarations, implementations };
}

module.exports = { extractInterfaces };
