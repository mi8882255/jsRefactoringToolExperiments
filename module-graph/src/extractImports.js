const traverseModule = require("@babel/traverse");
const traverse = traverseModule.default || traverseModule;

/**
 * Walks a Babel AST and returns every module reference found in the file:
 *   [{ source, kind, names }]
 * kind is one of: "require", "dynamic-require", "import", "import-type",
 *                 "export-from", "export-type-from", "dynamic-import"
 * names is a best-effort list of imported/exported identifiers (for labeling).
 */
function extractImports(ast) {
  const refs = [];

  const push = (source, kind, names = []) => {
    if (typeof source === "string" && source.length > 0) {
      refs.push({ source, kind, names });
    }
  };

  const namesFromSpecifiers = (specifiers = []) =>
    specifiers.map((s) => {
      if (s.type === "ImportDefaultSpecifier") return "default";
      if (s.type === "ImportNamespaceSpecifier") return "*";
      if (s.type === "ImportSpecifier") return s.imported.name || s.imported.value;
      if (s.type === "ExportSpecifier") return s.exported.name || s.exported.value;
      if (s.type === "ExportDefaultSpecifier") return "default";
      if (s.type === "ExportNamespaceSpecifier") return "*";
      return s.local && s.local.name;
    });

  traverse(ast, {
    // import X from 'y'; import {a} from 'y'; import type {a} from 'y';
    ImportDeclaration(path) {
      const node = path.node;
      const kind = node.importKind === "type" ? "import-type" : "import";
      push(node.source.value, kind, namesFromSpecifiers(node.specifiers));
    },

    // export { a } from 'y'; export * from 'y'; export type { a } from 'y';
    ExportNamedDeclaration(path) {
      const node = path.node;
      if (node.source) {
        const kind = node.exportKind === "type" ? "export-type-from" : "export-from";
        push(node.source.value, kind, namesFromSpecifiers(node.specifiers));
      }
    },
    ExportAllDeclaration(path) {
      const node = path.node;
      push(node.source.value, "export-from", ["*"]);
    },

    // import('y')  /  import('y').then(...)
    Import(path) {
      const parent = path.parentPath.node;
      if (parent.type === "CallExpression" && parent.arguments[0] && parent.arguments[0].type === "StringLiteral") {
        push(parent.arguments[0].value, "dynamic-import");
      }
    },
    ImportExpression(path) {
      const node = path.node;
      if (node.source && node.source.type === "StringLiteral") {
        push(node.source.value, "dynamic-import");
      }
    },

    // require('y')  /  require.resolve('y')  /  await import('y') handled above
    CallExpression(path) {
      const node = path.node;
      const callee = node.callee;
      const firstArg = node.arguments[0];
      const isStringArg = firstArg && firstArg.type === "StringLiteral";

      if (callee.type === "Identifier" && callee.name === "require" && isStringArg) {
        push(firstArg.value, "require");
        return;
      }

      if (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        callee.object.name === "require" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "resolve" &&
        isStringArg
      ) {
        push(firstArg.value, "require");
      }
    },

    // TS: import X = require('y');
    TSImportEqualsDeclaration(path) {
      const node = path.node;
      const ref = node.moduleReference;
      if (ref && ref.type === "TSExternalModuleReference" && ref.expression.type === "StringLiteral") {
        push(ref.expression.value, "require");
      }
    },
  });

  return refs;
}

module.exports = { extractImports };
