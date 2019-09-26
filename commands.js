module.exports = (log, modHelper, fs) => {
  const storedAstFileName = __dirname + "/stored_ast.txt";
  const helperFunctions = {
    getAstsConfigFromFile: () => {
      vscode.window.showInformationMessage(storedAstFileName);
      return fs.existsSync(storedAstFileName)
        ? JSON.parse(fs.readFileSync(storedAstFileName))
        : {};
    },
    parseAstFromSelectedCode: () => {
      ast = parse(code, {
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        ranges: false
      });
      recursiveCleanAst(ast);
    },
    getAstFromSelect: () => {
      ast = {
        type: "File",
        program: {
          type: "Program",
          body: JSON.parse(codeAsArray.slice(1).join("\n")),
          directives: []
        },
        comments: []
      };
    },
    generateCodeFromAst: () => {
      output = generate(ast).code.replace(/\n\n/, "\n");
    }
  };

  const simpeFunctions = {
    ast: () => {
      helperFunctions.getAstFromSelect();
      helperFunctions.generateCodeFromAst();
    },
    set_mask: () => {
      helperFunctions.parseAstFromSelectedCode();
      const storedAst = helperFunctions.getAstsConfigFromFile();
      storedAst.mask = ast;
      fs.writeFileSync(storedAstFileName, JSON.stringify(storedAst));
    },
    set_template: () => {
      helperFunctions.parseAstFromSelectedCode();
      const storedAst = helperFunctions.getAstsConfigFromFile();
      storedAst.template = ast;
      fs.writeFileSync(storedAstFileName, JSON.stringify(storedAst));
    },
    mutate: () => {
      helperFunctions.parseAstFromSelectedCode();
      storedAst = JSON.parse(
        fs.readFileSync(storedAstFileName) || '{"mask":{}, "template":{}}'
      );
      if (storedAst.mask && storedAst.template) {
        data = mutate(ast, storedAst.mask, storedAst.template);
        debugAst = data.debug;
        ast = data.template;
      }
      helperFunctions.generateCodeFromAst();
    },
    diff_mask: () => {
      helperFunctions.parseAstFromSelectedCode();
      storedAst = JSON.parse(
        fs.readFileSync(storedAstFileName) || '{"mask":{}}'
      ).mask;
      debugAst = jDiff.diff(storedAst, ast);
      ast = { program: { body: {} } };
    }
  };

  const impl = {
    execute: selectionContent => {
      try {
        const codeAsArray = (selectionContent || "").split("\n");
        let commandLine = codeAsArray[0].trim();
        let command =
          commandLine.substr(0, 2) === "//" ? commandLine.substr(2) : "";

        let ast = "",
          output;

        if (Object.keys(simpeFunctions).includes(command)) {
          simpeFunctions[command]();
        }
        return { raw: output, ast: JSON.stringify(ast.program.body, null, 2) };
      } catch (e) {
        return { raw: selectionContent, ast: `Err: ${JSON.stringify(e)}` };
      }
    }
  };

  return impl;
};
