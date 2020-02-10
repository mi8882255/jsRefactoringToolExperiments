const fs = require('fs');
const fileContent = fs.readFileSync(process.argv[2]).toString();
const parse = require('@babel/parser').parse;
const dataMod = require('../data_modifications')({ info: console.log });

const getAst = (content) => {
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
const ast = getAst(fileContent).program.body;

const simpleShow = a => console.log(a);

  const jArr = dataMod.jsonToStringArray(ast,true);
//   jArr.map(simpleShow);
const getElByIndex = i => jArr[i];
const varUsages = {};
const varCreate = {};

  const isVarSimpleWordRe = /::\w+$/

  dataMod.searchInStrArrayRe(jArr,/type::Identifier/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-3).join(':')+':name'),true);

    nameEl.map(el => {
        // console.log(jArr[el])
        if (isVarSimpleWordRe.test(jArr[el]) && !/key:name::/.test(jArr[el]) ) {
            varUsages[jArr[el].split('::').slice(-1)] = true;
        }
    });
  });

const payloadFinderFn = (re1, cutCount, routeAdd, filterNegativeRe, filterPositiveRe, resultVar) => {
	dataMod.searchInStrArrayRe(jArr, re1, true).map(e => {
		const addFn = (el) => {
			if (
				isVarSimpleWordRe.test(jArr[el])
				&& (filterNegativeRe === false || !filterNegativeRe.test(jArr[el]))
				&& (filterPositiveRe === false || filterPositiveRe.test(jArr[el]))
			) {
				const val = jArr[el].split('::').slice(-1)[0];
				const route = jArr[el].split('::')[0].split(':').slice(1, -cutCount).join(':');
					resultVar[route+val] = [val,route];
			}
		};

		if (cutCount === 0) {
			addFn(e);
			return;
		}

		const routeArr = e.split(':');
		// elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))

		const nameEl = dataMod.searchInStrArrayRe(jArr, new RegExp(routeArr.slice(0, -cutCount).join(':') + routeAdd), true);

		nameEl.map(el => {
			// console.log(jArr[el])
			addFn(el)
		});
	})
};

const payloadsArr = [
	[/type::Identifier/, 3, ':name', /key:name::/, false, varUsages],
	[/type::ArrowFunctionExpression/, 2, ':params', false, /params:\d+:name/, varCreate],
	[/type::FunctionExpression/, 2, ':params', false, /params:\d+:name/, varCreate],
	[/type::VariableDeclarator/, 2, ':id:name', false, false, varCreate],
	[/type::AssignmentExpression/, 2, ':left:name', false, false, varCreate],
	[/handler:param:name/, 0, '', false, false, varCreate],
];

for (const plFnParams of payloadsArr) {
	payloadFinderFn(...plFnParams);
}
  const varUsagesSet = new Set(Object.keys(varUsages))
  const varCreateSet = new Set(Object.keys(varCreate))
