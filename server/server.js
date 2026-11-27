const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Book library server chal raha hai" });
});

app.listen(3000, () => {
  console.log("Server http://localhost:3000 par chal raha hai");
});