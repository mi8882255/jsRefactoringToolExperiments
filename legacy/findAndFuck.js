#!/Users/i.morgunov/.nvm/versions/node/v8.11.1/bin/node
const fs = require('fs');
const {parse} =require('@babel/parser');
const generate = require('@babel/generator').default;

const dataMod = require('./data_modifications')({info:console.log});
const commands = require('./commands')({info:console.log}, dataMod, fs, parse, generate);
//(log, modHelper, fs, parse, generate)

data = fs.readFileSync(process.argv[2]).toString();

const recursiveObjWalk = (obj, payloadFn, path = []) => {
    for (let key of Object.keys(obj)) {
        const payloadFnResult = payloadFn(obj[key], path, key)
        
        if (obj[key] && typeof obj[key] === "object") {
            recursiveObjWalk(obj[key], payloadFn, [...path, key]);
        }
      
    }
}
// console.log(data);
try {
    const ast = commands.helperFunctions.parseAstFromSelectedCode(data);
} catch (error) {
    console.error(process.argv[2]);
    console.error('Parse error');
}

// console.log(ast);

findFn = (root, path, key) => {
    try {
        const processAct = (a,b,cond) => {
            return ((a === b) === cond)
        }

        const processCompare = (compareArr) =>{
            // console.log(compareArr);
            for (act of compareArr) {
                if (act[0] === '|') {
                    if (!processAct(...act[1]) && !processAct(...act[2])) {
                        return false;
                    }
                } else {
                    if (!processAct(...act)) {
                        return false;
                    }
                }
            }

            return true;
        };

        const compare1 = [
            [root.type, "LogicalExpression", true],
            [root.operator, "||", true],
            [root.left.type, "BinaryExpression", true],
            ['|',[root.left.operator, "!==", true],[root.left.operator, "!=", true]],
            [root.right.type, "BinaryExpression", true],
            ['|',[root.right.operator, "!==", true],[root.right.operator, "!=", true]],
        ]

//{"type":"LogicalExpression","left":{"type":"BinaryExpression","left":{"type":"Identifier","name":"a"},"operator":"!==","right":{"type":"Identifier","name":"NaN"}},"operator":"||","right":{"type":"BinaryExpression","left":{"type":"Identifier","name":"b"},"operator":"!==","right":{"type":"Identifier","name":"NaN"}}}
        if (!processCompare(compare1)) {return;}

        const compare2 = [ // a!==1 || a!==2
            [JSON.stringify(root.left.left), JSON.stringify(root.right.left), true],
            [JSON.stringify(root.left.right), JSON.stringify(root.right.right), false],
            [root.left.left.type.indexOf('Literal'), -1, true],
            [
                !root.left.left.type  
                || (root.left.left.type !== "Identifier") 
                ||  ((root.left.left.type === "Identifier" && (!root.left.left.name || !["undefined", "NaN"].includes(root.left.left.name)))), 
                true, true
            ]
        ];

        const compare3 = [ // 1!==a || 2!==a
            [JSON.stringify(root.left.left), JSON.stringify(root.right.left), false],
            [JSON.stringify(root.left.right), JSON.stringify(root.right.right), true],
            [root.left.right.type.indexOf('Literal'), -1, true],
            [
                !root.left.right.type  
                || (root.left.right.type !== "Identifier") 
                ||  ((root.left.right.type === "Identifier" && (!root.left.right.name || !["undefined", "NaN"].includes(root.left.right.name)))), 
                true, true
            ]
        ];

        if (!processCompare(compare2) && !processCompare(compare3)) {return;}  
    } catch (error) {
        return ;
    }

    console.log(process.argv[2])
    console.log(generate(root).code.replace(/\n\n/, "\n"))


}

recursiveObjWalk(ast, findFn)


//code
a = -1

//ast
[
  {
    "type": "ExpressionStatement",
    "expression": {
      "type": "AssignmentExpression",
      "operator": "=",
      "left": {
        "type": "Identifier",
        "name": "a"
      },
      "right": {
        "type": "UnaryExpression",
        "operator": "-",
        "prefix": true,
        "argument": {
          "type": "NumericLiteral",
          "extra": {
            "rawValue": 1,
            "raw": "1"
          },
          "value": 1
        }
      }
    }
  }
]
