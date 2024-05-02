const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// CARDS
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1 if no query param provided
  const limit = parseInt(req.query.limit) || 25; // Default to 20 if no query param provided
  const offset = (page - 1) * limit; // Calculate the offset based on the page and limit

  console.log('Page: ',page);
  console.log('Limit: ',limit);
  console.log('Offset: ',offset);

  const query = req.query.query || ''; // Default query to blank
  const sort = req.query.sort || 'name ASC'; // Default sort to Series_ID

  // Query to count total records without applying limit and offset
  const countSQL = `SELECT COUNT(*) AS totalCount FROM cards WHERE name LIKE ?`;
  console.log(countSQL);
  connection.query(countSQL, [`%${query}%`], (err, countResult) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    const totalRecords = countResult[0].totalCount; // Total records in the filtered result set
    const totalPages = Math.ceil(totalRecords / limit);

    console.log('Total Records:', totalRecords);
    console.log('Total Pages:', totalPages);

    // Query to fetch paginated data with limit and offset
    let cardsSQL = `SELECT * FROM cards WHERE name LIKE ? ORDER BY ${sort} LIMIT ? OFFSET ?`;
    console.log(cardsSQL);
    connection.query(cardsSQL, [`%${query}%`, limit, offset], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      // Render your page with the paginated data and total pages
      res.render('cards/cards', {
        cardsList: result,
        limit,
        currentQuery: query,
        currentSort: sort,
        currentPage: page,
        totalPages,
        totalRecords,
      });
    });
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
