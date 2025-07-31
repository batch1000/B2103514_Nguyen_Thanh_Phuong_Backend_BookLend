const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./app/api/auth/auth.routes'));
app.use('/api/book', require('./app/api/book/book.routes'));

module.exports = app;