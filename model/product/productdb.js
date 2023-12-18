const mongoose = require("mongoose");
const ProductSchema = new mongoose.Schema({
  productname: { type: String },
  category: { type: String },
  price: { type: Number },
  rating: { type: Number },
  model: { type: String },
  description: { type: String },
  stock:{type:Number},
  image: [{ type: String }],
  isListed: { type: Boolean },
});

const productcolllection = mongoose.model("product", ProductSchema, "product");
module.exports = productcolllection;
