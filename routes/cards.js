const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// CARDS
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;     // Default to page 1 if no query param provided
  const limit = parseInt(req.query.limit) || 25;  // Default to 20 if no query param provided
  const offset = (page - 1) * limit;              // Calculate the offset based on the page and limit
  const query = req.query.query || '';            // Default query to blank
  const sort = req.query.sort || 'name ASC';      // Default sort to Series_ID

  let cardIDs = []; // Initialize cardIDs as an empty array

  // Query for total cards in database
  const countSQL = `SELECT COUNT(*) AS totalCount FROM cards WHERE name LIKE ?`;
  connection.query(countSQL, [`%${query}%`], (err, countResult) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    const totalRecords = countResult[0].totalCount;
    const totalPages = Math.ceil(totalRecords / limit);

    if (req.session.user) {
      // Query for users collection
      let UserCollectionIdSQL = `SELECT id FROM collection WHERE user_id = ?`;
      connection.query(UserCollectionIdSQL, [req.session.user], (err, UserCollectionId) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Internal Server Error');
        }

        // Query for users cards in collection
        let UserCollectionCardsSQL = `SELECT * FROM collections_cards WHERE collection_ID = ?`
        connection.query(UserCollectionCardsSQL, [UserCollectionId[0].id], (err, UserCollectionCards) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
          }
          const cardIDs = UserCollectionCards.map(card => card.card_ID);
          
          // Query for fetch paginated data with limit and offset
          let cardsSQL = `SELECT * FROM cards WHERE name LIKE ? ORDER BY ${sort} LIMIT ? OFFSET ?`;
          console.log(cardsSQL);
          connection.query(cardsSQL, [`%${query}%`, limit, offset], (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).send('Internal Server Error');
            }

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
              userCollection: cardIDs,
            });
          });
        });
      });

    } else {
      // Query for fetch paginated data with limit and offset
      let cardsSQL = `SELECT * FROM cards WHERE name LIKE ? ORDER BY ${sort} LIMIT ? OFFSET ?`;
      console.log(cardsSQL);
      connection.query(cardsSQL, [`%${query}%`, limit, offset], (err, cardsArray) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Internal Server Error');
        }

        res.render('cards/cards', {
          user: req.session.user,
          displayName: req.session.displayName,
          cardsList: cardsArray,
          limit,
          currentQuery: query,
          currentSort: sort,
          currentPage: page,
          totalPages,
          totalRecords,
          userCollection: cardIDs,
        });
      });
    }
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
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    // Fetch the user's collection ID from the database
    const userCollectionIdQuery = `SELECT id FROM collection WHERE user_id = ?`;
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

// Remove From Collection
router.post("/remove-from-collection", async (req, res) => {

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
    const userCollectionIdQuery = `SELECT id FROM collection WHERE user_id = ?`;
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

      // Fetch the cards's card_collection ID
      const collectionCardSQL = 'SELECT id FROM collections_cards WHERE collection_ID = ? AND card_ID = ?';
      connection.query(collectionCardSQL, [userCollectionId, cardId], (err, collectionCardIdres) => {
        if (err) {
          console.error('Error fetching user collection ID:', err);
          return res.status(500).json({ error: 'Error fetching user collection ID' });
        }

        const collectionCardId = collectionCardIdres[0].id;

        // Remove card from card_collection table
        const deleteQuery = 'DELETE FROM collections_cards WHERE id = ?';
        connection.query(deleteQuery, [collectionCardId], (deleteErr, result) => {
          if (deleteErr) {
            console.error('Error removing card from collection:', deleteErr);
            return res.status(500).json({ error: 'Error adding card to collection' });
          }
          console.log('Card removed.');
          return res.status(200).json({ success: true });
        });
      });
    });
  } catch (error) {
    console.error('Error adding card to collection:', error);
    return res.status(500).json({ error: 'Error adding card to collection' });
  }
});

module.exports = router;
