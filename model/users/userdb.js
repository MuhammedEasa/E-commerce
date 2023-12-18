const mongoose = require("mongoose");


// creating Schema
const userSchema = mongoose.Schema({
  username: {
    type: String,
    
  },
  email: {
    type: String,
    
  },
  phoneNumber: {
    type: Number,  
    
  },
  password: {
    type: String,
    
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  isOtpVerified: {
    type: Boolean,
    default: false,
  },
  wallet: {
    type: Number,
    default: 0, 
  },
  referralCode: {
    type: String,
  }
});
// Creating Model
const collection = new mongoose.model("usercollection", userSchema,"usercollection");

module.exports = collection;
