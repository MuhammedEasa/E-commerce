const mongoose = require("mongoose");

const profileImage = new mongoose.Schema({
    userid:
     {
         type: String 
        },
        profilePic:{
            type:String
        }
})
const accountPic = mongoose.model("profilePic", profileImage, "profilePic");
module.exports = accountPic;
