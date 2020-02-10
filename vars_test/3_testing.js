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

dataMod.searchInStrArrayRe(jArr, /type::Identifier/, true).map(e => {
  const routeArr = e.split(":");
  // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
  const nameEl = dataMod.searchInStrArrayRe(
    jArr,
    new RegExp(routeArr.slice(0, -3).join(":") + ":name"),
    true
  );

  nameEl.map(el => {
    // console.log(jArr[el])
    varUsages[jArr[el].split("::").slice(-2)] = true;
  });
});

dataMod
  .searchInStrArrayRe(jArr, /type::ArrowFunctionExpression/, true)
  .map(e => {
    const routeArr = e.split(":");
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(
      jArr,
      new RegExp(routeArr.slice(0, -2).join(":") + ":params"),
      true
    );

    nameEl.map(el => {
      console.log(jArr[el]);
      if (/params:\d+:name/.test(el)) {
        varCreate[jArr[el].split("::").slice(-1)] = true;
      }
    });
  });

dataMod.searchInStrArrayRe(jArr, /type::FunctionExpression/, true).map(e => {
  const routeArr = e.split(":");
  // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
  const nameEl = dataMod.searchInStrArrayRe(
    jArr,
    new RegExp(routeArr.slice(0, -2).join(":") + ":params"),
    true
  );

  nameEl.map(el => {
    console.log(jArr[el]);
    if (/params:\d+:name/.test(el)) {
      varCreate[jArr[el].split("::").slice(-1)] = true;
    }
  });
});

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

