obj1 = {"mask":{"type":"File","program":{"type":"Program","sourceType":"script","interpreter":null,"body":[{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"MemberExpression","object":{"type":"Identifier","name":"console"},"property":{"type":"Identifier","name":"log"},"computed":false},"arguments":[{"type":"Identifier","name":"__ph"}]}}],"directives":[]},"comments":[]},"template":{"type":"File","program":{"type":"Program","sourceType":"script","interpreter":null,"body":[{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"MemberExpression","object":{"type":"Identifier","name":"log"},"property":{"type":"Identifier","name":"info"},"computed":false},"arguments":[{"type":"Identifier","name":"__ph"}]}}],"directives":[]},"comments":[]}};

ast = [
	{
		"type": "ExpressionStatement",
		"expression": {
			"type": "CallExpression",
			"callee": {
				"type": "MemberExpression",
				"object": {
					"type": "Identifier",
					"name": "console"
				},
				"property": {
					"type": "Identifier",
					"name": "log"
				},
				"computed": false
			},
			"arguments": [
				{
					"type": "StringLiteral",
					"extra": {
						"rawValue": 1,
						"raw": "'sasai'"
					},
					"value": "sasai"
				}
			]
		}
	}
];
const simpleShow  = a => console.log(a)

const dataMod = require('./data_modifications')({info:console.log});

jArr = dataMod.jsonToStringArray(ast,true);
// jArr.map(simpleShow);
const getElByIndex = i => jArr[i]

dataMod.searchInStrArrayRe(jArr,/type::Identifier/,true).map(e => simpleShow(getElByIndex(e)))

