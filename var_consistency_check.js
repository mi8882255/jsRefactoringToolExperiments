
const fs = require('fs');
const fileContent = fs.readFileSync(process.argv[2]).toString();
const parse = require('@babel/parser').parse;
const dataMod = require('./data_modifications')({info:console.log});

const getAst = (content)=>{
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
}
const ast = getAst(fileContent).program.body;

  const simpleShow  = a => console.log(a)


  
  const jArr = dataMod.jsonToStringArray(ast,true);
//   jArr.map(simpleShow);
  const getElByIndex = i => jArr[i]
  const varUsages = {};
  const varCreate = {};

  const isVarSimpleWordRe = /\:\:\w+$/

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
      if (isVarSimpleWordRe.test(jArr[el]) && !/key:name::/.test(jArr[el])) {
        varUsages[jArr[el].split("::").slice(-1)] = true;
      }
    });
  });

  dataMod.searchInStrArrayRe(jArr,/type::ArrowFunctionExpression/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':params'),true)

    nameEl.map(el => {
        // console.log(jArr[el])
        if (/params:\d+:name/.test(jArr[el]) && isVarSimpleWordRe.test(jArr[el])) {
            varCreate[jArr[el].split('::').slice(-1)] = true;
        }
    });
  })

  dataMod.searchInStrArrayRe(jArr,/type::FunctionExpression/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':params'),true)

    nameEl.map(el => {
        // console.log(jArr[el])
        if (/params:\d+:name/.test(jArr[el]) && isVarSimpleWordRe.test(jArr[el])) {
            varCreate[jArr[el].split('::').slice(-1)] = true;
        }
        
    });
  })

  dataMod.searchInStrArrayRe(jArr,/type::VariableDeclarator/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':id:name'),true)

    nameEl.map(el => {
        // console.log(jArr[el])
        if (isVarSimpleWordRe.test(jArr[el])) {
            varCreate[jArr[el].split('::').slice(-1)] = true;
        }
        
    });
  })

  dataMod.searchInStrArrayRe(jArr,/type::AssignmentExpression/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':left:name'),true)

    nameEl.map(el => {
        // console.log(jArr[el])
        if (isVarSimpleWordRe.test(jArr[el])) {
            varCreate[jArr[el].split('::').slice(-1)] = true;
        }
    });
  })

  dataMod.searchInStrArrayRe(jArr,/handler:param:name/,true).map(el => {
    // console.log(jArr[e]);
    if (isVarSimpleWordRe.test(jArr[el])) {
        varCreate[jArr[el].split('::').slice(-1)] = true;
    }
  })

  console.log();
  console.log('Var usage');
  Object.keys(varUsages).map(simpleShow);
  console.log();
  console.log('Var create');
  Object.keys(varCreate).map(simpleShow);

  const varUsagesSet = new Set(Object.keys(varUsages))
  const varCreateSet = new Set(Object.keys(varCreate))


  console.log();  
  console.log();
  console.log('+');
  console.log([...varUsagesSet].filter(e => !varCreateSet.has(e)));
  console.log('-');
  console.log([...varCreateSet].filter(e => !varUsagesSet.has(e)));