//set_mask
__mod_name.then(function (arg) { __body })

//set_template
console.log(__mod_name1);
require('myfolder' + __mod_name1)
require('myfolder' + __mod_name2)

    //diff_mask

    //mutate
    (a) => {
    require(await(async () => { })());
}

//code
log.info('sasai');

//debug
[{ "path": ["root", "program", "body", "0", "expression", "arguments", "0"], "mask": { "type": "Identifier", "name": "__ph" }, "obj": { "type": "StringLiteral", "extra": { "rawValue": "sasai", "raw": "'sasai'" }, "value": "sasai" } }], { "type": "File", "program": { "type": "Program", "sourceType": "script", "interpreter": null, "body": [{ "type": "ExpressionStatement", "expression": { "type": "CallExpression", "callee": { "type": "MemberExpression", "object": { "type": "Identifier", "name": "log" }, "property": { "type": "Identifier", "name": "info" }, "computed": false }, "arguments": [{ "type": "Identifier", "name": "__ph" }] } }], "directives": [] }, "comments": [] }


//run
console.log('piu-piu')


    (f) => {
    a = 1
    let b = 2
    const c = 3
    var e = 4
}



it('Should safe with type field(notify).', function (itDone) {
    var errMessage;
    ertertert.given().then(function () {
        return azzzz(12);
    }).then(function (retMsg) {
        assert.equal(retMsg, some.message);
    }).then(function () {
        return Q.all([
            ctx.redisHGet('qwe', 'q'),
            ctx.redisHGet('qwe', 'w'),
            ctx.redisHGet('wer', 'e'),
        ])
    }).then(function (retValues) {
        assert.deepEqual(retValues, withTypeFieldTestCase.expectedValues,
            'Not expected select result. Expected: ' + etert + '. Actual: ' + tytur);
    }).catch(function (err) {
        errMessage = err;
    }).done(function () {
        itDone(errMessage)
    })
});

//

//code
it('Should safe with type field(notify).', async () => {
    let errMessage;

    try {
        await ertertert.given();
        const retMsg = await azzzz(12)
        assert.equal(retMsg, some.message);

        retValues = [];
        retValues.push(await ctx.redisHGet('qwe', 'q'))
        retValues.push(await ctx.redisHGet('qwe', 'w'))
        retValues.push(await ctx.redisHGet('wer', 'e'))

        assert.deepEqual(retValues, withTypeFieldTestCase.expectedValues,
            'Not expected select result. Expected: ' + etert + '. Actual: ' + tytur);
    } catch (err) {
        errMessage = err;
    }
});

//ast
[
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
]





//code
const a = function () {
    b = 1;
}

//ast
[
    {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "a"
                },
                "init": {
                    "type": "FunctionExpression",
                    "id": null,
                    "generator": false,
                    "async": false,
                    "params": [],
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
                                        "name": "b"
                                    },
                                    "right": {
                                        "type": "NumericLiteral",
                                        "extra": {
                                            "rawValue": 1,
                                            "raw": "1"
                                        },
                                        "value": 1
                                    }
                                }
                            }
                        ],
                        "directives": []
                    }
                }
            }
        ],
        "kind": "const"
    }
]


//run
/\:\:\w+$/.test('string:program:body:16:expression:callee:object:arguments:1:pattern::handlename')
//debug
/*
true
*/

//debug
/*
true
*/
//debug
/*
false
*/


//code
if (z!==a && z !== b) {
  doSomeWork();
}
//find for 
//if (root.type === "LogicalExpression"),
//if (root.operator === "&&")
//if (root.left.type === "BinaryExpression")
//if (root.left.operator === "!==")
//if (root.right.type === "BinaryExpression")
//if (root.right.operator === "!==")

//if (JSON.stringify(root.left.left) === JSON.stringify(root.right.left))
//if (JSON.stringify(root.left.right) !== JSON.stringify(root.right.right))
//or
//if (JSON.stringify(root.left.left) !== JSON.stringify(root.right.left))
//if (JSON.stringify(root.left.right) === JSON.stringify(root.right.right))

//ast
[
  {
    "type": "IfStatement",
    "test": {
      "type": "LogicalExpression",
      "left": {
        "type": "BinaryExpression",
        "left": {
          "type": "Identifier",
          "name": "z"
        },
        "operator": "!==",
        "right": {
          "type": "Identifier",
          "name": "a"
        }
      },
      "operator": "&&",
      "right": {
        "type": "BinaryExpression",
        "left": {
          "type": "Identifier",
          "name": "z"
        },
        "operator": "!==",
        "right": {
          "type": "Identifier",
          "name": "b"
        }
      }
    },
    "consequent": {
      "type": "BlockStatement",
      "body": [
        {
          "type": "ExpressionStatement",
          "expression": {
            "type": "CallExpression",
            "callee": {
              "type": "Identifier",
              "name": "doSomeWork"
            },
            "arguments": []
          }
        }
      ],
      "directives": []
    },
    "alternate": null
  }
]
