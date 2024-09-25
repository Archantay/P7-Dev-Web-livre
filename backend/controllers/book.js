const Book = require('../models/book');
const fs = require('fs');
const mongoose = require('mongoose');

exports.createBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;
    const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
 });
 book.save()
   .then(() => res.status(201).json({ message: 'Livre enregistré !'}))
   .catch(error => res.status(400).json({ error }));
};

exports.modifyBook = (req, res, next) => {
    const bookObject = req.file ? {
      ...JSON.parse(req.body.book),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };
  delete bookObject._userId;
   Book.findOne({_id: req.params.id})
       .then((book) => {
           if (book.userId != req.auth.userId) {
               res.status(401).json({ message : 'Not authorized'});
           } else {
               Book.updateOne({ _id: req.params.id}, { ...bookObject, _id: req.params.id})
               .then(() => res.status(200).json({message : 'Objet modifié!'}))
               .catch(error => res.status(401).json({ error }));
           }
       })
       .catch((error) => {
           res.status(400).json({ error });
       });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
  .then(book => {
      if (book.userId != req.auth.userId) {
          res.status(401).json({message: 'Not authorized'});
      } else {
          const filename = book.imageUrl.split('/images/')[1];
          fs.unlink(`images/${filename}`, () => {
              Book.deleteOne({_id: req.params.id})
                  .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                  .catch(error => res.status(401).json({ error }));
          });
      }
  })
  .catch( error => {
      res.status(500).json({ error });
  });
};

exports.getBestRatedBooks = (req, res, next) => {
  Book.aggregate([
      {
          $addFields: {
              averageRating: { $avg: "$ratings.grade" }
          }
      },
      {
          $sort: { averageRating: -1 } // Trie par moyenne décroissante
      },
      {
          $limit: 3 // Limite aux 3 premiers livres
      }
  ])
  .then(books => res.status(200).json(books))
  .catch(error => res.status(400).json({ error }));
};

exports.getOneBook = (req, res, next) => {
    const bookId = req.params.id;
    Book.findOne({ _id: bookId })
      .then(book => res.status(200).json(book))
      .catch(error => res.status(404).json({ error }));
};

exports.getAllBook = (req, res, next) => {
    Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error}));
};

exports.rateBook = (req, res, next) => {
  const userId = req.auth.userId;
  const { rating } = req.body;
 
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "La note doit être un nombre entre 1 et 5." });
  }

  const bookId = req.params.id;
  if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "ID de livre invalide." });
  }

  Book.findOne({ _id: bookId })
      .then(book => {
          if (!book) {
              return res.status(404).json({ message: 'Livre non trouvé.' });
          }       
          const existingRatingIndex = book.ratings.findIndex(rating => rating.userId.toString() === userId.toString());

          if (existingRatingIndex !== -1) {
              book.ratings[existingRatingIndex].grade = rating;
          } else {
              book.ratings.push({ userId, grade: rating });
          }
          const totalRatings = book.ratings.reduce((sum, rating) => sum + rating.grade, 0);
          book.averageRating = totalRatings / book.ratings.length;

          book.save()
              .then(updatedBook => {
                  res.status(200).json(
                    updatedBook
                  );
              })
              .catch(error => {
                  console.error('Erreur lors de la sauvegarde du livre :', error);
                  res.status(500).json({ error: "Erreur lors de la sauvegarde du livre." });
              });
      })
      .catch(error => {
          console.error('Erreur lors de la recherche du livre :', error);
          res.status(500).json({ error: "Erreur serveur." });
      });
};



