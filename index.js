const express = require("express");
const path = require("path");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
const config = require("./config/db");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;
const app = express();

//bodyparser config
app.use(bodyParser.json());
app.use(cors());

//setup db
mongoose.set("useCreateIndex", true);
mongoose
  .connect(config.database, { useNewUrlParser: true })
  .then(() => {
    console.log("Database is connected"); //track connection
  })
  .catch(err => {
    console.log({ database_error: err }); //track error in db
  });

app.use(logger("dev")); //init morgan
//configure body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("What are you looking for here??...Go Back Joor");
});
// app.use(express.static(path.join(__dirname, "/public")));

// route handlers
const users = require("./users/user/routes/user");
app.use("/user", users);

app.listen(PORT, () => {
  console.log(`App is Running on ${PORT}`);
});
