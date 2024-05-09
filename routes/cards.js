const express = require('express');
const router = express.Router();
const connection = require('../database');

// CARDS
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;     // Default to page 1 if no query param provided
  const limit = parseInt(req.query.limit) || 25;  // Default to 20 if no query param provided
  const offset = (page - 1) * limit;              // Calculate the offset based on the page and limit
  const query = req.query.query || '';            // Default query to blank
  const sort = req.query.sort || 'name ASC';      // Default sort to Series_ID

  let userCollection = [];  // Initialize userCollection as an empty array
  let userWishlist = [];    // Initialize userWishlist as an empty array

  // NEEDS UPDATED FOR FILTERS
  // Query for total cards in database
  const countSQL = `
  SELECT COUNT(*) AS totalCount 
  FROM cards 
  WHERE name LIKE ?`;
  connection.query(countSQL, [`%${query}%`], (err, countResult) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    const totalRecords = countResult[0].totalCount;
    const totalPages = Math.ceil(totalRecords / limit);

    // Query for fetch paginated data with limit and offset
    let cardsSQL = `
    SELECT * 
    FROM cards 
    WHERE name LIKE ? 
    ORDER BY ${sort} 
    LIMIT ? OFFSET ?`;
    connection.query(cardsSQL, [`%${query}%`, limit, offset], (err, cardsList) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      // If user is logged in get their collection and wishlist
      if (req.session.user) {

        // Get card ids in users collection
        let combinedUserCollectionSQL = `
        SELECT collections_cards.card_ID
        FROM collections_cards
        JOIN collection ON collections_cards.collection_ID = collection.id
        WHERE collection.user_id = ?`;
        connection.query(combinedUserCollectionSQL, [req.session.user], (err, userCollectionCards) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
          }
          userCollection = userCollectionCards.map(card => card.card_ID);

          // Get card ids in users wishlist
          let userWishlistSQL = `
          SELECT wishlist_cards.card_id 
          FROM wishlist_cards 
          JOIN wishlist ON wishlist_cards.wishlist_id = wishlist.id
          WHERE wishlist.user_id = ?`;
          connection.query(userWishlistSQL, [req.session.user], (err, userWishlistCards) => {
            if (err) {
              console.error(err);
              return res.status(500).send('Internal Server Error');
            }
            userWishlist = userWishlistCards.map(card => card.card_ID);

            res.render('cards/cards', {
              user: req.session.user,
              displayName: req.session.displayName,
              userCollection,
              userWishlist,
              cardsList,
              limit,
              currentQuery: query,
              currentSort: sort,
              currentPage: page,
              totalPages,
              totalRecords,
            });
          });
        });

      } else {
        res.render('cards/cards', {
          user: req.session.user,
          displayName: req.session.displayName,
          userCollection,
          userWishlist,
          cardsList,
          limit,
          currentQuery: query,
          currentSort: sort,
          currentPage: page,
          totalPages,
          totalRecords,
        });
      }
    });
  });
});

// CARDS DETAILS
router.get('/:cardsId', (req, res) => {
  const cardsId = req.params.cardsId; // Get the card ID from URL params

  // Get the specified card
  const cardsSQL = `
  SELECT * 
  FROM cards 
  WHERE id = ?`;
  connection.query(cardsSQL, [cardsId], (err, cardsResult) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    // Check if card result is empty
    if (cardsResult.length === 0) {
      return res.status(404).send('Card not found');
    }

    // Get the card attacks
    const cardAttacksSQL = `
    SELECT * 
    FROM pokemon_attacks 
    WHERE card_id = ?`;
    connection.query(cardAttacksSQL, [cardsId], (err, cardAttacks) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      console.log('Card Attacks: ', cardAttacks);

      // Render the card details page with the card data
      res.render('cards/cardsdetails', {
        card: cardsResult[0],
        cardAttacks,
      });
    })
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
    const userCollectionIdQuery = `
    SELECT id 
    FROM collection 
    WHERE user_id = ?`;
    connection.query(userCollectionIdQuery, [userId], (err, userWishlistResult) => {
      if (err) {
        console.error('Error fetching user collection ID:', err);
        return res.status(500).json({ error: 'Error fetching user collection ID' });
      }

      // Check if the user's collection ID exists
      if (userWishlistResult.length === 0) {
        console.log("User collection ID not found");
        return res.status(404).json({ error: 'User collection ID not found' });
      }

      const userCollectionId = userWishlistResult[0].id;

      // Now that we have the user's collection ID, perform the insert into collections_cards
      const insertQuery = `
      INSERT INTO collections_cards (collection_ID, card_ID) 
      VALUES (?, ?)`;
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
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    // Fetch the user's collection ID from the database
    const userCollectionIdQuery = `
    SELECT id 
    FROM collection 
    WHERE user_id = ?`;
    connection.query(userCollectionIdQuery, [userId], (err, userWishlistResult) => {
      if (err) {
        console.error('Error fetching user collection ID:', err);
        return res.status(500).json({ error: 'Error fetching user collection ID' });
      }

      // Check if the user's collection ID exists
      if (userWishlistResult.length === 0) {
        console.log("User collection ID not found");
        return res.status(404).json({ error: 'User collection ID not found' });
      }

      const userCollectionId = userWishlistResult[0].id;

      // Fetch the cards's card_collection ID
      const collectionCardSQL = `
      SELECT id 
      FROM collections_cards 
      WHERE collection_ID = ? 
      AND card_ID = ?`;
      connection.query(collectionCardSQL, [userCollectionId, cardId], (err, collectionCardIdres) => {
        if (err) {
          console.error('Error fetching user collection ID:', err);
          return res.status(500).json({ error: 'Error fetching user collection ID' });
        }

        const collectionCardId = collectionCardIdres[0].id;

        // Remove card from card_collection table
        const deleteQuery = `
        DELETE FROM collections_cards 
        WHERE id = ?`;
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

// Add to Wishlist
router.post("/add-to-wishlist", async (req, res) => {
  const { cardId } = req.body; // Extract cardId from request body
  const userId = req.session.user;

  console.log('Card ID: ', cardId);
  console.log('User ID: ', userId);

  // Check if user is logged in
  if (!userId) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    // Fetch the user's wishlist ID from the database
    const userWishlistIdQuery = `
    SELECT id 
    FROM wishlist 
    WHERE user_id = ?`;
    connection.query(userWishlistIdQuery, [userId], (err, userWishlistResult) => {
      if (err) {
        console.error('Error fetching user wishlist ID:', err);
        return res.status(500).json({ error: 'Error fetching user wishlist ID' });
      }

      // Check if the user's wishlist ID exists
      if (userWishlistResult.length === 0) {
        console.log("User wishlist ID not found");
        return res.status(404).json({ error: 'User wishlist ID not found' });
      }

      const userWishlistId = userWishlistResult[0].id;

      // Now that we have the user's wishlist ID, perform the insert into wishlist_cards
      const insertQuery = `
      INSERT INTO wishlist_cards (wishlist_ID, card_ID) 
      VALUES (?, ?)`;
      connection.query(insertQuery, [userWishlistId, cardId], (insertErr, result) => {
        if (insertErr) {
          console.error('Error adding card to wishlist:', insertErr);
          return res.status(500).json({ error: 'Error adding card to wishlist' });
        }
        console.log('Card added ');
        return res.status(200).json({ success: true });
      });
    });
  } catch (error) {
    console.error('Error adding card to wishlist:', error);
    return res.status(500).json({ error: 'Error adding card to wishlist' });
  }
});

// Remove From Wishlist
router.post("/remove-from-wishlist", async (req, res) => {

  const { cardId } = req.body; // Extract cardId from request body
  const userId = req.session.user;

  console.log('Card ID: ', cardId);
  console.log('User ID: ', userId);

  // Check if user is logged in
  if (!userId) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  try {
    // Fetch the user's wishlist ID from the database
    const userWishlistIdQuery = `
    SELECT id 
    FROM wishlist 
    WHERE user_id = ?`;
    connection.query(userWishlistIdQuery, [userId], (err, userWishlistResult) => {
      if (err) {
        console.error('Error fetching user wishlist ID:', err);
        return res.status(500).json({ error: 'Error fetching user wishlist ID' });
      }

      // Check if the user's wishlist ID exists
      if (userWishlistResult.length === 0) {
        console.log("User wishlist ID not found");
        return res.status(404).json({ error: 'User wishlist ID not found' });
      }

      const userWishlistId = userWishlistResult[0].id;

      // Fetch the cards's wishlist_cards ID
      const wishlistCardSQL = `
      SELECT id 
      FROM wishlist_cards 
      WHERE wishlist_id = ? 
      AND card_ID = ?`;
      connection.query(wishlistCardSQL, [userWishlistId, cardId], (err, wishlistCardIdres) => {
        if (err) {
          console.error('Error fetching user wishlist ID:', err);
          return res.status(500).json({ error: 'Error fetching user wishlist ID' });
        }

        const wishlistCardId = wishlistCardIdres[0].id;

        // Remove card from wishlist_card table
        const deleteQuery = `
        DELETE FROM wishlist_cards 
        WHERE id = ?`;
        connection.query(deleteQuery, [wishlistCardId], (deleteErr, result) => {
          if (deleteErr) {
            console.error('Error removing card from wishlist:', deleteErr);
            return res.status(500).json({ error: 'Error removing card from wishlist' });
          }
          console.log('Card removed.');
          return res.status(200).json({ success: true });
        });
      });
    });
  } catch (error) {
    console.error('Error removing card from wishlist:', error);
    return res.status(500).json({ error: 'Error removing card from wishlist' });
  }
});

module.exports = router;
