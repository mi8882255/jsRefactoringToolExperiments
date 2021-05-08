//TODO: code runner
//TODO:

module.exports = (log, modHelper, fs, parse, generate) => {
  const storedAstFileName = __dirname + "/stored_ast.txt";
  const helperFunctions = {
    parseSelectionToArray: (selectionContent) => {
      const codeAsArray = (selectionContent || "").split("\n");
      let commandLine = codeAsArray[0].trim();
      let command =
        commandLine.substr(0, 2) === "//"
          ? commandLine.substr(2)
          : "code_to_ast";

      return {
        arr: codeAsArray,
        command: command,
      };
    },
    getAstsConfigFromFile: () => {
      // log.info(storedAstFileName);
      return fs.existsSync(storedAstFileName)
        ? JSON.parse(fs.readFileSync(storedAstFileName))
        : {};
    },
    /**
     *
     * @param selectionContent
     * @return object
     */
    parseAstFromSelectedCode: (selectionContent, clean = true) => {
      const { arr, command } = helperFunctions.parseSelectionToArray(
        selectionContent
      );
      selectionContent =
        command === "code_to_ast" ? arr.join("\n") : arr.slice(1).join("\n");

      let ast = parse(selectionContent, {
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        ranges: false,
      });

      if (clean) modHelper.recursiveCleanAst(ast);

      return ast;
    },
    getAstFromSelect: (selectionContent) => {
      const { arr } = helperFunctions.parseSelectionToArray(selectionContent);

      // noinspection UnnecessaryLocalVariableJS
      const ast = {
        type: "File",
        program: {
          type: "Program",
          body: JSON.parse(arr.slice(1).join("\n")),
          directives: [],
        },
        comments: [],
      };

      return ast;
    },
    generateCodeFromAst: (ast) => {
      return generate(ast).code.replace(/\n\n/, "\n");
    },
  };

  const simpeFunctions = {
    ast: (selectionContent) => {
      const ast = helperFunctions.getAstFromSelect(selectionContent);
      const code = helperFunctions.generateCodeFromAst(ast);
      return { code, ast: JSON.stringify(ast, null, 2) };
    },
    set_mask: (selectionContent) => {
      const ast = helperFunctions.parseAstFromSelectedCode(selectionContent);
      const storedAst = helperFunctions.getAstsConfigFromFile();
      storedAst.mask = ast;
      fs.writeFileSync(storedAstFileName, JSON.stringify(storedAst));
      return { raw: selectionContent };
    },
    set_template: (selectionContent) => {
      const ast = helperFunctions.parseAstFromSelectedCode(selectionContent);
      const storedAst = helperFunctions.getAstsConfigFromFile();
      storedAst.template = ast;
      fs.writeFileSync(storedAstFileName, JSON.stringify(storedAst));
      return { raw: selectionContent };
    },
    mutate: (selectionContent) => {
      let debug = "",
        ast = "";
      let astFromSelection = helperFunctions.parseAstFromSelectedCode(
        selectionContent
      );
      const storedAst = {
        mask: {},
        template: {},
        ...helperFunctions.getAstsConfigFromFile(),
      };

      if (storedAst.mask && storedAst.template) {
        const result = modHelper.mutate(
          astFromSelection,
          storedAst.mask,
          storedAst.template
        );
        debug = result.debug;
        ast = result.template;
      } else {
        debug = "wtf";
      }

      const code = helperFunctions.generateCodeFromAst(ast);

      return { code };
    },
    diff_mask: (selectionContent) => {
      let ast = helperFunctions.parseAstFromSelectedCode(selectionContent);
      const storedAst = {
        mask: {},
        template: {},
        ...helperFunctions.getAstsConfigFromFile(),
      };
      const debug = JSON.stringify(modHelper.diff(storedAst.mask, ast));
      ast = { program: { body: {} } };

      return { debug };
    },
    code_to_ast: (selectionContent) => {
      const astFull = helperFunctions.parseAstFromSelectedCode(
        selectionContent
      );
      const astForPrint = astFull.program.body;
      return {
        code: selectionContent,
        ast: JSON.stringify(astForPrint, null, 2),
      };
    },
    json_format: (selectionContent) => {
      const { arr } = helperFunctions.parseSelectionToArray(selectionContent);
      selectionContent = arr.slice(1).join("\n");

      return {
        code: JSON.stringify(JSON.parse(selectionContent), null, 2),
      };
    },
    run: (selectionContent) => {
      let evalScript = "";
      // evalScript += 'out = "";console = {log: (txt) => out+=txt}; res =' ;
      evalScript += selectionContent;
      // evalScript += ';out'

      const result = eval(evalScript);
      return {
        raw: selectionContent,
        debug: `/*\n${result}\n*/`,
      };
    },
    get_vars: (selectionContent) => {
      const ast = helperFunctions.parseAstFromSelectedCode(selectionContent);
      const payloadFn = (val, path, key) => {
        // if (val.type === "ArrowFunctionExpression") {
        // }
        // if (val.type === "FunctionExpression") {
        //   //get .params[].name
        // }
        // if (val.type === "VariableDeclarator") {
        //   //get .id.name
        // }
        // //unsafe vars
        // if (val.type === "AssignmentExpression") {
        //   //get .left.name
        // }
        // // if (val.)
      };

      modHelper.recursiveObjWalk(ast, payloadFn);
    },
  };

  // noinspection UnnecessaryLocalVariableJS
  const impl = {
    execute: (selectionContent, editor) => {
      try {
        const { command } = helperFunctions.parseSelectionToArray(
          selectionContent
        );
        log.info("Command is:" + command);
        let result = {};
        if (Object.keys(simpeFunctions).includes(command)) {
          result = simpeFunctions[command](selectionContent, command);
        }

        const before = result.before || "";
        const code = result.code || "";
        const ast = result.ast || "";
        const debug = result.debug || "";
        const raw = result.raw || "";

        return { before, code, ast, debug, raw };
      } catch (e) {
        return {
          code: selectionContent,
          debug: `Err: ${JSON.stringify(e)}`,
          ast: "",
          before: "",
        };
      }
    },
    helperFunctions,
  };

  return impl;
};
