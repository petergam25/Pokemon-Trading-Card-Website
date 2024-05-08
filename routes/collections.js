const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection
const { body, validationResult } = require('express-validator');

// MY COLLECTIONS
router.get('/my-collections', (req, res) => {

    if (!req.session.user) {
        console.log('Unauthorized access to my collection page.');
        return res.status(403).send('You must be logged in to view this page.');
    }

    const errorMessage = '';
    const userId = req.session.user;

    const userCollectionsSQL = `SELECT * FROM collection WHERE user_id = ?`
    connection.query(userCollectionsSQL, [userId], (err, userCollections) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        console.log('Trying to render')
        res.render('collections/collections', {
            user: req.session.user,
            displayName: req.session.displayName,
            collectionList: userCollections,
            errorMessage,
        });
    })
});


// ADD COLLECTION
router.post('/add-collection', [
    body('newCollectionName').trim().isLength({ min: 5, max: 50 }).withMessage('Collection name must be 5 to 50 characters long.'),
], (req, res) => {
    const { newCollectionName } = req.body;

    if (!req.session.user) {
        console.log('Unauthorized access to my collection page.');
        return res.status(403).send('You must be logged in to view this page.');
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array()[0].msg;
        return renderCollectionsWithError(req, res, errorMessage);
    }

    // Check if collection name already exists
    const checkCollectionNameSQL = `SELECT * FROM collection WHERE name = ? AND user_id = ?`;
    connection.query(checkCollectionNameSQL, [newCollectionName, req.session.user], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error checking collection name');
        }

        // Collection Name Already Exists
        if (rows.length > 0) {
            return renderCollectionsWithError(req, res, 'Collection name already exists.');
        }

        // Insert New Collection
        const insertCollectionSQL = `INSERT INTO collection (name, user_id) VALUES (?, ?)`;
        connection.query(insertCollectionSQL, [newCollectionName, req.session.user], (err, result) => {
            if (err) {
                console.error('Error inserting collection:', err);
                return res.status(500).send('Error inserting collection');
            }

            console.log('New collection creation successful');
            // Render my-collections after successful insertion
            return renderCollectionsWithError(req, res, '');
        });
    });
});

// DELETE COLLECTION
router.post('/delete-collection', (req, res) => {
    const collectionIdToDelete = req.body.collectionId; // Assuming you send the collection ID in the request body

    if (!req.session.user) {
        console.log('Unauthorized access to delete collection.');
        return res.status(403).send('You must be logged in to perform this action.');
    }

    // Check if the user owns the collection (optional, depending on your logic)
    const checkOwnershipSQL = `SELECT * FROM collection WHERE id = ? AND user_id = ?`;
    connection.query(checkOwnershipSQL, [collectionIdToDelete, req.session.user], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error checking collection ownership');
        }

        if (rows.length === 0) {
            return res.status(403).send('You are not authorized to delete this collection.');
        }

        // Delete the collection
        const deleteCollectionSQL = `DELETE FROM collection WHERE id = ?`;
        connection.query(deleteCollectionSQL, [collectionIdToDelete], (err, result) => {
            if (err) {
                console.error('Error deleting collection:', err);
                return res.status(500).send('Error deleting collection');
            }

            console.log('Collection deleted successfully');
            // Render my-collections after successful insertion
            return renderCollectionsWithError(req, res, '');
        });
    });
});

// BROWSE COLLECTIONS
router.get('/browse', (req, res) => {

    const errorMessage = '';
    const userId = req.session.user;

    const userCollectionsSQL = `SELECT * FROM collection`
    connection.query(userCollectionsSQL, [userId], (err, userCollections) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        console.log('Trying to render')
        res.render('collections/collections', {
            user: req.session.user,
            displayName: req.session.displayName,
            collectionList: userCollections,
            errorMessage,
        });
    })
});

// VIEW COLLECTION
router.get('/:collectionID', (req, res) => {

    const collectionID = req.params.collectionID;   // Get the collection ID from URL params
    const page = parseInt(req.query.page) || 1;     // Default to page 1 if no query param provided
    const limit = parseInt(req.query.limit) || 25;  // Default to 20 if no query param provided
    const offset = (page - 1) * limit;              // Calculate the offset based on the page and limit
    const query = req.query.query || '';            // Default query to blank
    const sort = req.query.sort || 'name ASC';      // Default sort to Series_ID

    // Get collection owner user ID
    let collectionOwnerIdSQL = `SELECT user_id from collection WHERE id = ?`
    connection.query(collectionOwnerIdSQL, [collectionID], (err, ownerUserId) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Get collection_cards from the users collection using collection id
        let UserCollectionCardsSQL = `SELECT * FROM collections_cards WHERE collection_ID = ?`
        connection.query(UserCollectionCardsSQL, [collectionID], (err, UserCollectionCards) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            const userCollection = UserCollectionCards.map(card => card.card_ID);

            // Query to fetch all cards
            let allCardsSQL = `SELECT * FROM cards WHERE id IN (SELECT card_ID FROM collections_cards WHERE collection_ID = ? ) AND name LIKE ?`;
            connection.query(allCardsSQL, [collectionID, `%${query}%`], (err, allCards) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                const totalRecords = allCards.length;
                const totalPages = Math.ceil(totalRecords / limit);

                // Query to fetch paginated cards with limit and offset
                let cardsSQL = `SELECT * FROM cards WHERE id IN (SELECT card_ID FROM collections_cards WHERE collection_ID = ? ) AND name LIKE ? ORDER BY ${sort} LIMIT ? OFFSET ?`;
                connection.query(cardsSQL, [collectionID, `%${query}%`, limit, offset], (err, collectionCards) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Internal Server Error');
                    }

                    // Render your page with the paginated data and total pages
                    res.render('collections/collectiondetails', {
                        user: req.session.user,
                        displayName: req.session.displayName,
                        cardsList: collectionCards,
                        limit,
                        currentQuery: query,
                        currentSort: sort,
                        currentPage: page,
                        totalPages,
                        totalRecords,
                        userCollection,
                        ownerUserId: ownerUserId[0].user_id,
                        collectionID
                    });
                });
            });
        })
    })
});

// Helper function to render collections page with error message
function renderCollectionsWithError(req, res, errorMessage) {
    const userId = req.session.user;
    const userCollectionsSQL = `SELECT * FROM collection WHERE user_id = ?`;

    connection.query(userCollectionsSQL, [userId], (err, userCollections) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.render('collections/collections', {
            user: req.session.user,
            displayName: req.session.displayName,
            collectionList: userCollections,
            errorMessage,
        });
    });
}

module.exports = router;