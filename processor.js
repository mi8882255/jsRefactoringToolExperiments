delete require.cache[require.resolve('./commands')];
delete require.cache[require.resolve('./data_modifications')];
const fs = require("fs");

/**
 * @typedef {Object} document
 * @property getText
 *
 * @typedef {Object} activeTextEditor
 * @property document
 * @property selection
 * @property edit
 *
 * @typedef {Object} window
 * @property showInformationMessage
 * @property activeTextEditor
 *
 * @typedef {Object} VscodeObj
 * @property {window}
 *
 * @param parse
 * @param generate
 * @param vscode VscodeObj
 * @return {{process: *}}
 */
module.exports = (parse, generate, vscode) => {
  const log = {
    info: (text)=>{
      vscode.window.showInformationMessage(text);
    }
  };

  const process = () => {
    try {
      const modHelper = require('./data_modifications')(log);
      const commands = require('./commands')(log,modHelper, fs, parse, generate);

      log.info("New1.2");
      let editor = vscode.window.activeTextEditor;
      if (editor) {
                    let document = editor.document;
                    let selection = editor.selection;

                    // Get the word within the selection
                    let selectionContent = document.getText(selection);
                    // vscode.window.showInformationMessage(selectionContent);

                    let result = commands.execute(selectionContent);
                    // log.info(JSON.stringify(result));

                    let updatedContent = "";
                    updatedContent += result.raw;
                    // noinspection JSMismatchedCollectionQueryUpdate
                    const commentedParts = [];
                    for (const part of ["before", "code", "ast", "debug"]) {
                      if (result[part]) {
                        updatedContent += "\n";
                        updatedContent += `//${part}\n`;
                        updatedContent += commentedParts.includes(part)
                          ? "/*"
                          : "";
                        updatedContent += `${result[part]}\n`;
                        updatedContent += commentedParts.includes(part)
                          ? "*/"
                          : "";
                      }
                    }
                    editor.edit(editBuilder => {
                      editBuilder.replace(selection, updatedContent);
                    });
                  }
    } catch (e) {
      log.info('Thrown in processor: ' +JSON.stringify(e));
    }
  };

  return {
    process
  };
};
