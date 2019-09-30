const ast = [
    {
      "type": "ExpressionStatement",
      "expression": {
        "type": "CallExpression",
        "callee": {
          "type": "Identifier",
          "name": "it"
        },
        "arguments": [
          {
            "type": "StringLiteral",
            "extra": {
              "rawValue": "Should safe with type field(notify).",
              "raw": "'Should safe with type field(notify).'"
            },
            "value": "Should safe with type field(notify)."
          },
          {
            "type": "ArrowFunctionExpression",
            "id": null,
            "generator": false,
            "async": true,
            "params": [],
            "body": {
              "type": "BlockStatement",
              "body": [
                {
                  "type": "VariableDeclaration",
                  "declarations": [
                    {
                      "type": "VariableDeclarator",
                      "id": {
                        "type": "Identifier",
                        "name": "errMessage"
                      },
                      "init": null
                    }
                  ],
                  "kind": "let"
                },
                {
                  "type": "TryStatement",
                  "block": {
                    "type": "BlockStatement",
                    "body": [
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "AwaitExpression",
                          "argument": {
                            "type": "CallExpression",
                            "callee": {
                              "type": "MemberExpression",
                              "object": {
                                "type": "Identifier",
                                "name": "ertertert"
                              },
                              "property": {
                                "type": "Identifier",
                                "name": "given"
                              },
                              "computed": false
                            },
                            "arguments": []
                          }
                        }
                      },
                      {
                        "type": "VariableDeclaration",
                        "declarations": [
                          {
                            "type": "VariableDeclarator",
                            "id": {
                              "type": "Identifier",
                              "name": "retMsg"
                            },
                            "init": {
                              "type": "AwaitExpression",
                              "argument": {
                                "type": "CallExpression",
                                "callee": {
                                  "type": "Identifier",
                                  "name": "azzzz"
                                },
                                "arguments": [
                                  {
                                    "type": "NumericLiteral",
                                    "extra": {
                                      "rawValue": 12,
                                      "raw": "12"
                                    },
                                    "value": 12
                                  }
                                ]
                              }
                            }
                          }
                        ],
                        "kind": "const"
                      },
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "Identifier",
                              "name": "assert"
                            },
                            "property": {
                              "type": "Identifier",
                              "name": "equal"
                            },
                            "computed": false
                          },
                          "arguments": [
                            {
                              "type": "Identifier",
                              "name": "retMsg"
                            },
                            {
                              "type": "MemberExpression",
                              "object": {
                                "type": "Identifier",
                                "name": "some"
                              },
                              "property": {
                                "type": "Identifier",
                                "name": "message"
                              },
                              "computed": false
                            }
                          ]
                        }
                      },
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "AssignmentExpression",
                          "operator": "=",
                          "left": {
                            "type": "Identifier",
                            "name": "retValues"
                          },
                          "right": {
                            "type": "ArrayExpression",
                            "elements": []
                          }
                        }
                      },
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "Identifier",
                              "name": "retValues"
                            },
                            "property": {
                              "type": "Identifier",
                              "name": "push"
                            },
                            "computed": false
                          },
                          "arguments": [
                            {
                              "type": "AwaitExpression",
                              "argument": {
                                "type": "CallExpression",
                                "callee": {
                                  "type": "MemberExpression",
                                  "object": {
                                    "type": "Identifier",
                                    "name": "ctx"
                                  },
                                  "property": {
                                    "type": "Identifier",
                                    "name": "redisHGet"
                                  },
                                  "computed": false
                                },
                                "arguments": [
                                  {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "qwe",
                                      "raw": "'qwe'"
                                    },
                                    "value": "qwe"
                                  },
                                  {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "q",
                                      "raw": "'q'"
                                    },
                                    "value": "q"
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      },
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "Identifier",
                              "name": "retValues"
                            },
                            "property": {
                              "type": "Identifier",
                              "name": "push"
                            },
                            "computed": false
                          },
                          "arguments": [
                            {
                              "type": "AwaitExpression",
                              "argument": {
                                "type": "CallExpression",
                                "callee": {
                                  "type": "MemberExpression",
                                  "object": {
                                    "type": "Identifier",
                                    "name": "ctx"
                                  },
                                  "property": {
                                    "type": "Identifier",
                                    "name": "redisHGet"
                                  },
                                  "computed": false
                                },
                                "arguments": [
                                  {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "qwe",
                                      "raw": "'qwe'"
                                    },
                                    "value": "qwe"
                                  },
                                  {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "w",
                                      "raw": "'w'"
                                    },
                                    "value": "w"
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      },
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "Identifier",
                              "name": "retValues"
                            },
                            "property": {
                              "type": "Identifier",
                              "name": "push"
                            },
                            "computed": false
                          },
                          "arguments": [
                            {
                              "type": "AwaitExpression",
                              "argument": {
                                "type": "CallExpression",
                                "callee": {
                                  "type": "MemberExpression",
                                  "object": {
                                    "type": "Identifier",
                                    "name": "ctx"
                                  },
                                  "property": {
                                    "type": "Identifier",
                                    "name": "redisHGet"
                                  },
                                  "computed": false
                                },
                                "arguments": [
                                  {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "wer",
                                      "raw": "'wer'"
                                    },
                                    "value": "wer"
                                  },
                                  {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "e",
                                      "raw": "'e'"
                                    },
                                    "value": "e"
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      },
                      {
                        "type": "ExpressionStatement",
                        "expression": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "Identifier",
                              "name": "assert"
                            },
                            "property": {
                              "type": "Identifier",
                              "name": "deepEqual"
                            },
                            "computed": false
                          },
                          "arguments": [
                            {
                              "type": "Identifier",
                              "name": "retValues"
                            },
                            {
                              "type": "MemberExpression",
                              "object": {
                                "type": "Identifier",
                                "name": "withTypeFieldTestCase"
                              },
                              "property": {
                                "type": "Identifier",
                                "name": "expectedValues"
                              },
                              "computed": false
                            },
                            {
                              "type": "BinaryExpression",
                              "left": {
                                "type": "BinaryExpression",
                                "left": {
                                  "type": "BinaryExpression",
                                  "left": {
                                    "type": "StringLiteral",
                                    "extra": {
                                      "rawValue": "Not expected select result. Expected: ",
                                      "raw": "'Not expected select result. Expected: '"
                                    },
                                    "value": "Not expected select result. Expected: "
                                  },
                                  "operator": "+",
                                  "right": {
                                    "type": "Identifier",
                                    "name": "etert"
                                  }
                                },
                                "operator": "+",
                                "right": {
                                  "type": "StringLiteral",
                                  "extra": {
                                    "rawValue": ". Actual: ",
                                    "raw": "'. Actual: '"
                                  },
                                  "value": ". Actual: "
                                }
                              },
                              "operator": "+",
                              "right": {
                                "type": "Identifier",
                                "name": "tytur"
                              }
                            }
                          ]
                        }
                      }
                    ],
                    "directives": []
                  },
                  "handler": {
                    "type": "CatchClause",
                    "param": {
                      "type": "Identifier",
                      "name": "err"
                    },
                    "body": {
                      "type": "BlockStatement",
                      "body": [
                        {
                          "type": "ExpressionStatement",
                          "expression": {
                            "type": "AssignmentExpression",
                            "operator": "=",
                            "left": {
                              "type": "Identifier",
                              "name": "errMessage"
                            },
                            "right": {
                              "type": "Identifier",
                              "name": "err"
                            }
                          }
                        }
                      ],
                      "directives": []
                    }
                  },
                  "finalizer": null
                }
              ],
              "directives": []
            }
          }
        ]
      }
    }
  ];

  const simpleShow  = a => console.log(a)

  const dataMod = require('./data_modifications')({info:console.log});
  
  jArr = dataMod.jsonToStringArray(ast,true);
//   jArr.map(simpleShow);
  const getElByIndex = i => jArr[i]
  const varUsages = {};
  const varCreate = {};

  dataMod.searchInStrArrayRe(jArr,/type::Identifier/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-3).join(':')+':name'),true)

    nameEl.map(el => {
        // console.log(jArr[el])
        varUsages[jArr[el].split('::').slice(-1)] = true;
    });
  })

  
//   if (val.type === "ArrowFunctionExpression") {

// }
// if (val.type === "FunctionExpression") {
//   //get .params[].name
// }

// if (val.type === "VariableDeclarator") {
//   //get .id.name
// }

// //unsafe vars
// if (val.type === "AssignmentExpression") {
//   //get .left.name
// }

  dataMod.searchInStrArrayRe(jArr,/type::ArrowFunctionExpression/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':params'),true)

    nameEl.map(el => {
        console.log(jArr[el])
        if (/params:\d+:name/.test(el)) {
            varCreate[jArr[el].split('::').slice(-1)] = true;
        }
    });
  })

  dataMod.searchInStrArrayRe(jArr,/type::FunctionExpression/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':params'),true)

    nameEl.map(el => {
        console.log(jArr[el])
        if (/params:\d+:name/.test(el)) {
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
        varCreate[jArr[el].split('::').slice(-1)] = true;
    });
  })

  dataMod.searchInStrArrayRe(jArr,/type::AssignmentExpression/,true).map(e => {
    const routeArr = e.split(':');
    // elAst = dataMod.getObjByPath(ast, routeArr.slice(1,-2))
    const nameEl = dataMod.searchInStrArrayRe(jArr,new RegExp(routeArr.slice(0,-2).join(':')+':left:name'),true)

    nameEl.map(el => {
        // console.log(jArr[el])
        varCreate[jArr[el].split('::').slice(-1)] = true;
    });
  })

  dataMod.searchInStrArrayRe(jArr,/handler:param:name/,true).map(e => {
    varCreate[jArr[e].split('::').slice(-1)] = true;
  })

  console.log('Var usage');
  Object.keys(varUsages).map(simpleShow);
  console.log();
  console.log('Var create');
  Object.keys(varCreate).map(simpleShow);