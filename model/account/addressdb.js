const mongoose = require('mongoose')



const addressSchema = new mongoose.Schema({
    userId:{
        type:String,
    },
    firstname:{
        type:String,
    },
    lastname:{
        type:String,
        },
        address:{
            type:String,
        },
        city:{
            type:String,
        },
        state:{
            type:String,
        },
        pincode:{
            type:Number,
        }, 
})
const addressdbs = mongoose.model("accountaddress", addressSchema, "accountaddress");
module.exports = addressdbs;