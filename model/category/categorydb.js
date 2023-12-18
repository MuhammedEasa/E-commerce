const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    category: {
        type: String,
    },
})

const categorycollection = mongoose.model('Category', categorySchema, "Category")
module.exports = categorycollection