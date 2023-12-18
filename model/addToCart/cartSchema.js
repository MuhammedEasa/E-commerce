const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema({
  userid: { type: String },
  productid: { type: String },
  product: { type: String },
  price: { type: Number },
  total: { type: Number },
  quantity: { type: Number },
  image: [{ type: String }]
});

const cartcolllection = mongoose.model("cart", cartSchema, "cart");
module.exports = cartcolllection;
