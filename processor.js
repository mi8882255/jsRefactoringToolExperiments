const fs = require("fs");

module.exports = (parse, generate, vscode) => {
  const log = {
    info: (text)=>{
      vscode.window.showInformationMessage(text);
    }
  };

  const modHelper = require('./data_modifications')(log);
  const commands = require('./commands')(log,modHelper, fs);

  const process = () => {
    try {
      vscode.window.showInformationMessage("Debug1 folder works *");
      let editor = vscode.window.activeTextEditor;
      if (editor) {
        let document = editor.document;
        let selection = editor.selection;

        // Get the word within the selection
        let selectionContent = document.getText(selection);
        // vscode.window.showInformationMessage(selectionContent);

        let result = commands.execute(selectionContent)
        let updatedContent = result.raw + "\n";
        updatedContent += "//ast\n";
        // updatedContent+='/*\n'
        updatedContent += result.ast;
        // updatedContent+='*/\n'
        editor.edit(editBuilder => {
          editBuilder.replace(selection, updatedContent);
        });
      }
    } catch (e) {
      vscode.window.showErrorMessage(e);
      // console.error(e);
    }
  };

  return {
    process
  };
};
