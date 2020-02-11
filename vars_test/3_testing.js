const parse = require("@babel/parser").parse;

const simpleShow = a => console.log(a);

const dataMod = require("../data_modifications")({ info: console.log });

const getAst = content => {
  const ast = parse(content, {
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    ranges: false
  });
  dataMod.recursiveCleanAst(ast);

  return ast;
};

const filename = `${__dirname}/fileForTest.js`;
console.log(filename);
const testableCode = require("fs").readFileSync(filename);
const ast = getAst(testableCode.toString());

const jArr = dataMod.jsonToStringArray(ast, true);
//   jArr.map(simpleShow);
const getElByIndex = i => jArr[i];
const varUsages = {};
const varCreate = {};

const addUsages = key => (varUsages[key] = true);
const addCreate = key => (varCreate[key] = true);

const searchAstWrapper = (re1, splitTo, re2, splitTo2, flag,  addFn) => {
  dataMod.searchInStrArrayRe(jArr, re1, flag).map(e => {
    const routeArr = e.split(":");
    const nameEl = dataMod.searchInStrArrayRe(
      jArr,
      new RegExp(routeArr.slice(0, splitTo).join(":") + re2),
      flag
    );

    nameEl.map(el => {
      // console.log(jArr[el])
      addFn(jArr[el].split("::").slice(splitTo2));
    });
  });
};

searchAstWrapper(/type::Identifier/, -3, ":name", -2, true, addUsages);

searchAstWrapper(/type::ArrowFunctionExpression/,-2,':params', -1, true, addCreate)


searchAstWrapper(/type::FunctionExpression/,-2,':params', -2, true, addCreate)
//searchAstWrapper(/type::FunctionExpression/,-2,':params', -2, true, addCreate)

dataMod.searchInStrArrayRe(jArr, /type::VariableDeclarator/, true).map(e => {
  const routeArr = e.split(":");
  // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
  const nameEl = dataMod.searchInStrArrayRe(
    jArr,
    new RegExp(routeArr.slice(0, -2).join(":") + ":id:name"),
    true
  );

  nameEl.map(el => {
    // console.log(jArr[el])
    varCreate[jArr[el].split("::").slice(-1)] = true;
  });
});

dataMod.searchInStrArrayRe(jArr, /type::AssignmentExpression/, true).map(e => {
  const routeArr = e.split(":");
  // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
  const nameEl = dataMod.searchInStrArrayRe(
    jArr,
    new RegExp(routeArr.slice(0, -2).join(":") + ":left:name"),
    true
  );

  nameEl.map(el => {
    // console.log(jArr[el])
    varCreate[jArr[el].split("::").slice(-1)] = true;
  });
});

dataMod.searchInStrArrayRe(jArr, /handler:param:name/, true).map(e => {
  varCreate[jArr[e].split("::").slice(-1)] = true;
});

console.log("Var usage");
Object.keys(varUsages).map(simpleShow);
console.log();
console.log("Var create");
Object.keys(varCreate).map(simpleShow);
