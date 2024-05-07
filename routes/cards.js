const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// CARDS
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1 if no query param provided
  const limit = parseInt(req.query.limit) || 25; // Default to 20 if no query param provided
  const offset = (page - 1) * limit; // Calculate the offset based on the page and limit
  const userId = req.session.user;

  console.log('Page: ', page);
  console.log('Limit: ', limit);
  console.log('Offset: ', offset);

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

    let UserCollectionIdSQL = `SELECT id FROM collection WHERE user_id = ? AND collection_type_ID = 1`;
    connection.query(UserCollectionIdSQL, [userId], (err, UserCollectionId) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      let UserCollectionCardsSQL = `SELECT * FROM collections_cards WHERE collection_ID = ?`
      connection.query(UserCollectionCardsSQL, [UserCollectionId], (err, UserCollectionCards) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Internal Server Error');
        }

        console.log(UserCollectionCards)

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
            user: req.session.user,
            displayName: req.session.displayName,
            cardsList: result,
            limit,
            currentQuery: query,
            currentSort: sort,
            currentPage: page,
            totalPages,
            totalRecords,
            wishlist: UserCollectionCards,
          });
        });
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

// Add to Collection
router.post("/add-to-collection", async (req, res) => {
  const { cardId } = req.body; // Extract cardId from request body
  const userId = req.session.user;

  console.log('Card ID: ', cardId);
  console.log('User ID: ', userId);

  // Check if user is logged in
  if (!userId) {
    console.log("User not logged in?");
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    // Fetch the user's collection ID from the database
    const userCollectionIdQuery = `SELECT id FROM collection WHERE user_id = ? AND collection_type_ID = 1`;
    connection.query(userCollectionIdQuery, [userId], (err, userCollectionIdResult) => {
      if (err) {
        console.error('Error fetching user collection ID:', err);
        return res.status(500).json({ error: 'Error fetching user collection ID' });
      }

      // Check if the user's collection ID exists
      if (userCollectionIdResult.length === 0) {
        console.log("User collection ID not found");
        return res.status(404).json({ error: 'User collection ID not found' });
      }

      const userCollectionId = userCollectionIdResult[0].id;

      // Now that we have the user's collection ID, perform the insert into collections_cards
      const insertQuery = 'INSERT INTO collections_cards (collection_ID, card_ID) VALUES (?, ?)';
      console.log('Card ID again: ', cardId)
      connection.query(insertQuery, [userCollectionId, cardId], (insertErr, result) => {
        if (insertErr) {
          console.error('Error adding card to collection:', insertErr);
          return res.status(500).json({ error: 'Error adding card to collection' });
        }
        console.log('Card added ');
        return res.status(200).json({ success: true });
      });
    });
  } catch (error) {
    console.error('Error adding card to collection:', error);
    return res.status(500).json({ error: 'Error adding card to collection' });
  }
});

module.exports = router;
