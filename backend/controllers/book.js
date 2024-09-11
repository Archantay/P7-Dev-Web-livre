const book = require('../book');
const Book = require('../book');
const fs = require('fs');

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

exports.getOneBook = (req, res, next) => {
    const bookId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
    }

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
    const { grade } = req.body;
  
    if (grade < 0 || grade > 5) {
      return res.status(400).json({ message: "La note doit être entre 0 et 5" });
    }
  
    Book.findOne({ _id: req.params.id })
      .then(book => {
        if (!book) {
          return res.status(404).json({ message: 'Livre non trouvé' });
        }
        const existingRating = book.ratings.find(rating => rating.userId === userId);
  
        if (existingRating) {
          return res.status(400).json({ message: "Vous avez déjà noté ce livre" });
        }
        book.ratings.push({ userId, grade });
  
        const totalRatings = book.ratings.reduce((sum, rating) => sum + rating.grade, 0);
        book.averageRating = totalRatings / book.ratings.length;
  
        book.save()
          .then(() => res.status(200).json({ message: 'Note ajoutée avec succès', averageRating: book.averageRating }))
          .catch(error => res.status(400).json({ error }));
      })
      .catch(error => res.status(500).json({ error }));
  };