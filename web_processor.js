const express = require("express");
const fs = require("fs");
const util = require("util");
const parse = require("@babel/parser").parse;
const generate = require("@babel/generator").default;
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
const port = 5003;

const log = {
  info: (text) => {
    console.log(text);
  },
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/", (req, res) => {
  console.log(req.body);
  delete require.cache[require.resolve("./commands")];
  delete require.cache[require.resolve("./data_modifications")];
  const modHelper = require("./data_modifications")(log);
  const commands = require("./commands")(log, modHelper, fs, parse, generate);

  let result = commands.execute(req.body.code);

  console.log(JSON.stringify(result));

  let rawResult = Object.keys(result).reduce((acc, k) => {
    acc += `//${k}\n${result[k]}\n`;
    return acc;
  }, "");
  res.send({ text: rawResult });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
