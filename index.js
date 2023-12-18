const express = require("express");
const app = express();
const nocache=require('nocache')
const mongoose = require('mongoose')
require('dotenv').config()
// database  connection
const connect = mongoose.connect(process.env.MONGO_URL);

//database connection checking on console.log
connect
  .then(() => console.log("database connected succesfully"))
  .catch(() => console.log("databasee connection failed"));


// for parsing application/json
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.set("views", ["./views/user", "./views/admin"]);
app.use(express.urlencoded({ extended: true })); // Use this middleware to parse form data
app.use(nocache())
const userRouter = require("./routers/user");
const adminRouter = require("./routers/admin");

app.use("/", userRouter);
app.use("/", adminRouter);
 // 404 error page
app.use((req, res) => { 
  res.status(404).render('error');
});

const port = process.env.PORT||2000;
app.listen(port, () =>
  console.log(`server is running on http://localhost:${port}/login`)
);
