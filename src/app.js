const express = require('express');
const bodyParser = require('body-parser');
require('./configs/mysql_db');
require('dotenv').config();
const path = require('path');

// ---- Routes -----
const usersRouter = require('./routes/usersRoutes');
const filesRoutes = require('./routes/filesRoutes');
const directoriesRoute = require('./routes/directoriesRoute');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  return res.status(200).send("Welcome to Amazon S3: Simple Cloud Storage API");
});

// app.use("/uploaded-file", express.static("uploads"));

// Routes
app.use('/api/auth', usersRouter);
app.use('/api/files', filesRoutes);
app.use('/api/directories', directoriesRoute);

// Start the server
app.listen(PORT, (err) => {
  if(!err) {
    console.log(`Server is running on port ${PORT}`);
  } else {
    console.log("Server is not running due to an error.");
  }
});
