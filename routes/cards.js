const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// CARDS
router.get('/', (req, res) => {
  const cardsSQL = `SELECT * FROM cards;`;

  connection.query(cardsSQL, (err, result) => {
    if (err) throw err;
    res.render("cards", { cardsList: result });
  });
});

// CARDS DETAILS
router.get('/:cardsId', (req, res) => {
  const cardsId = req.params.cardsId; // Get the series ID from URL params

  // Query the database to fetch details of the specified series
  const cardsSQL = `SELECT * FROM cards WHERE id = ?`;

  connection.query(cardsSQL, [cardsId], (err, cardsResult) => {
    if (err) {
      // Handle database query error
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    // Check if card result is empty
    if (cardsResult.length === 0) {
      // Card not found, send 404 response
      return res.status(404).send('Card not found');
    }

    // Render the series details page with the series and sets data
    res.render('cardsdetails', {
      card: cardsResult[0] // Assuming only one card is expected with this ID
    });
  });
});

module.exports = router;
