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
						"rawValue": "sasai",
						"raw": "'sasai'"
					},
					"value": "sasai"
				}
			]
		}
	}
];
const dataMod = require('./data_modifications')({info:console.log});

// console.log(obj1.mask.program.body);
// console.log(ast);
res = dataMod.mutate(ast, obj1.mask.program.body, obj1.template.program.body)
// res.debug.map(txt => {console.log(txt);console.log()});
// console.log();
console.log(JSON.stringify(res.template));

// aa= '[{"type":"ExpressionStatement","expression":{"type":"CallExpression","callee":{"type":"MemberExpression","object":{"type":"Identifier","name":"log"},"property":{"type":"Identifier","name":"info"},"computed":false},"arguments":[{"type":"Identifier","name":"__ph"}]}}]';
//
// bb = '{"type":"Identifier","name":"__ph"}';
// aa.replace(bb, '____azazazaz____')
// console.log(aa);