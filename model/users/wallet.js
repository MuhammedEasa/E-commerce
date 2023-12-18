const mongoose = require("mongoose");


const walletSchema = new mongoose.Schema({
    Email: {
        type: String,
    },
    date: {
        type: Date,
    },
    amount: {
        type: Number,
    },
    creditordebit: {
        type: String,
    },
})
// Creating Model
const Wallet = new mongoose.model("walletCollection", walletSchema,"walletCollection");

module.exports = Wallet;