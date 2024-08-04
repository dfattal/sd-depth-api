// index.js for node.js server api

const express = require('express');
const app = express();
app.listen(5001, () => console.log("Api is running on port 5001"));
app.get('/', (req, res) => {
  console.log("Hello, from the root endpoint!");
  res.send("Hello, from the root endpoint!");
});