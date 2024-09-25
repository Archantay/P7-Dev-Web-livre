const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

module.exports = (req, res, next) => {
    if (!req.file) {
        return next();
    }
    const imagePath = req.file.path;
    const outputImagePath = path.join('images', 'compressed_' + req.file.filename);

    sharp(imagePath)
        .resize({ width: 800 })
        .toFile(outputImagePath, (err, info) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de la compression de l\'image' });
            }
            fs.unlink(imagePath, (err) => {
                if (err) console.log('Erreur lors de la suppression de l\'image originale');
            });
            req.file.path = outputImagePath;
            req.file.filename = 'compressed_' + req.file.filename;

            next();
        });
};