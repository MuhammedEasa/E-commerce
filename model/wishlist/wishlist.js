const mongoose = require("mongoose");
const wishlist=new mongoose.Schema({
    userId:{
        type:String
    },
    productId:{
        type:String
    },
    product:{
        type:String
    },
    price:{
        type:Number
    },
    image:{
        type:String
    }
})
const wishlistSchema=new mongoose.model('wishlist',wishlist,'wishlist')

module.exports=wishlistSchema