#!/usr/bin/node

const fs = require('fs');
const dm = require('./data_modifications.js')({info:console.log});

const stdinContent = fs.readFileSync(0).toString();
const fileContent = fs.readFileSync(process.argv[2]).toString();

const parse = require('@babel/parser').parse;

getAst = (content)=>{
    const ast = parse(content, {
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        ranges: false
      });
      dm.recursiveCleanAst(ast);

      return ast;
}

const a1 = getAst(stdinContent);
const a2 = getAst(fileContent);

dm.diff(a1,a2).map(data=>{console.log(JSON.stringify(data, null, 2))});