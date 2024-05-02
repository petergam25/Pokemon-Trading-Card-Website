const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// CARDS
router.get('/', (req, res) => {

  const query = req.query.query || ''; // Default query to blank
  const userSort = req.query.sort || 'Card name (A-Z)'; // Default sort to Series_ID

  let sort;
  switch (userSort) {
    case 'Card name (A-Z)':
      sort = 'name ASC';
      break;

    case 'Card name (Z-A)':
      sort = 'name DESC';
      break;

    case 'Rarity (asc)':
      sort = 'rarity ASC';
      break;

    case 'Rarity (desc)':
      sort = 'rarity DESC';
      break;

    default:
      sort = 'name ASC';
      break;
  }

  let cardsSQL = `SELECT * FROM cards WHERE name LIKE ? ORDER BY ${sort}`;

  console.log(cardsSQL);

  connection.query(cardsSQL, [`%${query}%`], (err, result) => {
    if (err) throw err;
    const limit = 51;
    res.render("cards/cards", { cardsList: result, limit, currentQuery : query, currentSort : userSort });
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
    res.render('cards/cardsdetails', {
      card: cardsResult[0] // Assuming only one card is expected with this ID
    });
  });
});

module.exports = router;
