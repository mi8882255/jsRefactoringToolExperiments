//before

//code
let a = 1;

//code
//ast
[
  {
    type: "VariableDeclaration",
    declarations: [
      {
        type: "VariableDeclarator",
        id: {
          type: "Identifier",
          name: "a",
        },
        init: {
          type: "NumericLiteral",
          extra: {
            rawValue: 1,
            raw: "1",
          },
          value: 1,
        },
      },
    ],
    kind: "let",
  },
];
//debug
Err: {
}
//ast

//before

//debug

//raw
