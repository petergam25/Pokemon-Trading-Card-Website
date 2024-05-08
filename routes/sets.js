const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// SETS
router.get('/', (req, res) => {

    const query = req.query.query || ''; // Default query to blank
    const sort = req.query.sort || 'series_ID'; // Default sort to Series_ID
    const order = req.query.order || 'ASC'; // Default order to ASC

    // Define the base SQL queries
    let setsSQL = `
        SELECT * 
        FROM sets 
        WHERE name LIKE ?
        ORDER BY ${sort}
        ${order}
    `;

    let seriesSQL = `
        SELECT DISTINCT series.* 
        FROM series 
        JOIN sets ON series.id = sets.series_ID 
        WHERE sets.name LIKE ?
        ORDER BY series.id
        ${order}
    `;

    connection.query(setsSQL, [`%${query}%`], (err, setList) => {
        if (err) throw err;

        connection.query(seriesSQL, [`%${query}%`], (err, seriesList) => {
            if (err) throw err;
            res.render('sets/sets', { user: req.session.user, displayName: req.session.displayName, setlist: setList, seriesList: seriesList, currentQuery: query, currentSort: sort, currentOrder: order }); // Pass currentFilter to the view
        });
    });
});

// SET DETAILS PAGE
router.get('/:setId', (req, res) => {

    const query = req.query.query || ''; // Default query to blank
    const sort = req.query.sort || 'name ASC'; // Default sort to Series_ID
    const setId = req.params.setId; // Get the set ID from URL params

    let cardIDs = []; // Initialize cardIDs as an empty array

    // Query the database to fetch details of the specified set
    const setSQL = `SELECT * FROM sets WHERE id = ?`;
    connection.query(setSQL, [setId], (err, result) => {
        if (err) {
            console.error('Error querying set: ', err)
            res.status(500).send('Internal server error.');
            return;
        }

        // Set not found
        if (result.length === 0) {
            res.status(404).send('Set not found.');

        } else {

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

                        // Query the database to fetch all cards belonging to the set
                        const cardsInSetSQL = `SELECT * FROM cards WHERE set_ID = ? AND name LIKE ? ORDER BY ${sort}`;
                        connection.query(cardsInSetSQL, [setId, `%${query}%`], (err, cardsResult) => {
                            if (err) {
                                console.error('Error querying set: ', err)
                                res.status(500).send('Internal server error.');
                                return;
                            }

                            // Render the set details page with the set data and card data
                            res.render('sets/setsdetails', {
                                user: req.session.user,
                                displayName: req.session.displayName,
                                set: result[0],
                                cardsList: cardsResult,
                                currentQuery: query,
                                currentSort: sort,
                                userCollection: cardIDs,
                            });
                        });
                    });
                });

            } else {
                // Query the database to fetch all cards belonging to the set
                const cardsInSetSQL = `SELECT * FROM cards WHERE set_ID = ? AND name LIKE ? ORDER BY ${sort}`;
                connection.query(cardsInSetSQL, [setId, `%${query}%`], (err, cardsResult) => {
                    if (err) {
                        console.error('Error querying set: ', err)
                        res.status(500).send('Internal server error.');
                        return;
                    }

                    // Render the set details page with the set data and card data
                    res.render('sets/setsdetails', {
                        user: req.session.user,
                        displayName: req.session.displayName,
                        set: result[0],
                        cardsList: cardsResult,
                        currentQuery: query,
                        currentSort: sort,
                        userCollection: cardIDs,
                    });
                });
            }
        }
    });
});

module.exports = router;
