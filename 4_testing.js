/* eslint-disable no-unused-vars */


//code
// it('Should safe with type field(notify).', function (itDone) {
//     var errMessage;
//     ertertert.given().then(function () {
//         return azzzz(12);
//     }).then(function (retMsg) {
//         assert.equal(retMsg, some.message);
//     }).then(function () {
//         return Q.all([
//             ctx.redisHGet('qwe', 'q'),
//             ctx.redisHGet('qwe', 'w'),
//             ctx.redisHGet('wer', 'e'),
//         ])
//     }).then(function (retValues) {
//         assert.deepEqual(retValues, withTypeFieldTestCase.expectedValues,
//             'Not expected select result. Expected: ' + etert + '. Actual: ' + tytur);
//     }).catch(function (err) {
//         errMessage = err;
//     }).done(function () {
//         itDone(errMessage)
//     })
// });

// it('Should safe with type field(notify).', async () => {
//     let errMessage;

//     try {
//         await ertertert.given();
//         const retMsg = await azzzz(12)
//         assert.equal(retMsg, some.message);

//         retValues = [];
//         retValues.push(await ctx.redisHGet('qwe', 'q'))
//         retValues.push(await ctx.redisHGet('qwe', 'w'))
//         retValues.push(await ctx.redisHGet('wer', 'e'))

//         assert.deepEqual(retValues, withTypeFieldTestCase.expectedValues,
//             'Not expected select result. Expected: ' + etert + '. Actual: ' + tytur);
//     } catch (err) {
//         errMessage = err;
//     }
// });

//ast
const beforeAst = [
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
          "type": "FunctionExpression",
          "id": null,
          "generator": false,
          "async": false,
          "params": [
            {
              "type": "Identifier",
              "name": "itDone"
            }
          ],
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
                "kind": "var"
              },
              {
                "type": "ExpressionStatement",
                "expression": {
                  "type": "CallExpression",
                  "callee": {
                    "type": "MemberExpression",
                    "object": {
                      "type": "CallExpression",
                      "callee": {
                        "type": "MemberExpression",
                        "object": {
                          "type": "CallExpression",
                          "callee": {
                            "type": "MemberExpression",
                            "object": {
                              "type": "CallExpression",
                              "callee": {
                                "type": "MemberExpression",
                                "object": {
                                  "type": "CallExpression",
                                  "callee": {
                                    "type": "MemberExpression",
                                    "object": {
                                      "type": "CallExpression",
                                      "callee": {
                                        "type": "MemberExpression",
                                        "object": {
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
                                        },
                                        "property": {
                                          "type": "Identifier",
                                          "name": "then"
                                        },
                                        "computed": false
                                      },
                                      "arguments": [
                                        {
                                          "type": "FunctionExpression",
                                          "id": null,
                                          "generator": false,
                                          "async": false,
                                          "params": [],
                                          "body": {
                                            "type": "BlockStatement",
                                            "body": [
                                              {
                                                "type": "ReturnStatement",
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
                                            ],
                                            "directives": []
                                          }
                                        }
                                      ]
                                    },
                                    "property": {
                                      "type": "Identifier",
                                      "name": "then"
                                    },
                                    "computed": false
                                  },
                                  "arguments": [
                                    {
                                      "type": "FunctionExpression",
                                      "id": null,
                                      "generator": false,
                                      "async": false,
                                      "params": [
                                        {
                                          "type": "Identifier",
                                          "name": "retMsg"
                                        }
                                      ],
                                      "body": {
                                        "type": "BlockStatement",
                                        "body": [
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
                                          }
                                        ],
                                        "directives": []
                                      }
                                    }
                                  ]
                                },
                                "property": {
                                  "type": "Identifier",
                                  "name": "then"
                                },
                                "computed": false
                              },
                              "arguments": [
                                {
                                  "type": "FunctionExpression",
                                  "id": null,
                                  "generator": false,
                                  "async": false,
                                  "params": [],
                                  "body": {
                                    "type": "BlockStatement",
                                    "body": [
                                      {
                                        "type": "ReturnStatement",
                                        "argument": {
                                          "type": "CallExpression",
                                          "callee": {
                                            "type": "MemberExpression",
                                            "object": {
                                              "type": "Identifier",
                                              "name": "Q"
                                            },
                                            "property": {
                                              "type": "Identifier",
                                              "name": "all"
                                            },
                                            "computed": false
                                          },
                                          "arguments": [
                                            {
                                              "type": "ArrayExpression",
                                              "elements": [
                                                {
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
                                                },
                                                {
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
                                                },
                                                {
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
                                              ]
                                            }
                                          ]
                                        }
                                      }
                                    ],
                                    "directives": []
                                  }
                                }
                              ]
                            },
                            "property": {
                              "type": "Identifier",
                              "name": "then"
                            },
                            "computed": false
                          },
                          "arguments": [
                            {
                              "type": "FunctionExpression",
                              "id": null,
                              "generator": false,
                              "async": false,
                              "params": [
                                {
                                  "type": "Identifier",
                                  "name": "retValues"
                                }
                              ],
                              "body": {
                                "type": "BlockStatement",
                                "body": [
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
                              }
                            }
                          ]
                        },
                        "property": {
                          "type": "Identifier",
                          "name": "catch"
                        },
                        "computed": false
                      },
                      "arguments": [
                        {
                          "type": "FunctionExpression",
                          "id": null,
                          "generator": false,
                          "async": false,
                          "params": [
                            {
                              "type": "Identifier",
                              "name": "err"
                            }
                          ],
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
                        }
                      ]
                    },
                    "property": {
                      "type": "Identifier",
                      "name": "done"
                    },
                    "computed": false
                  },
                  "arguments": [
                    {
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
                              "type": "CallExpression",
                              "callee": {
                                "type": "Identifier",
                                "name": "itDone"
                              },
                              "arguments": [
                                {
                                  "type": "Identifier",
                                  "name": "errMessage"
                                }
                              ]
                            }
                          }
                        ],
                        "directives": []
                      }
                    }
                  ]
                }
              }
            ],
            "directives": []
          }
        }
      ]
    }
  }
];

//ast
const astAfter = [
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

walkObjRecursive