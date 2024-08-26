const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
  userId: { type: String, required: false },
  title: { type: String, required: true },
  author: { type: String, required: true },
  imageUrl: { type: String, required: false },
  year: { type: Number, required: true },
  description: { type: String, required: true },
  genre: { type: String, required: true },
  ratting: [{
    userId: { type: String, required: false },
    grade: { type: Number, required: true },
    }],
  averageRating: { type: Number, required: true },
});

module.exports = mongoose.model('Book', bookSchema);


    