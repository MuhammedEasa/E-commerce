const mongoose = require('mongoose')
const orderSchema = new mongoose.Schema({
    userId: { type: String },
    username: { type: String },
    products: [{
      productid: { type: String },
      product: { type: String },
      quantity: { type: Number },
      price: { type: Number },
      status: { type: String },
    }],
    totalQuantity: { type: Number },
    totalPrice: { type: Number },
    address: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: Number }
    },
    orderDate: { type: Date },
    paymentMethod:{type:String},
    deliveryDate: { type: Date },
  });
  
const OrderDb = mongoose.model("productOrder", orderSchema, "productOrder");
module.exports = OrderDb;