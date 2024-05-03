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

    console.log('Sets SQL: ', setsSQL);
    console.log('Series SQL: ', seriesSQL);

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
    const setId = req.params.setId; // Get the set ID from URL params

    // Query the database to fetch details of the specified set
    const setSQL = `SELECT * FROM sets WHERE id = ?`;
    const cardsInSetSQL = 'SELECT * FROM cards WHERE set_ID = ?'

    connection.query(setSQL, [setId], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            // Handle case where set is not found
            res.status(404).send('Set not found.');
        } else {
            // Query the database to fetch all cards belonging to the set
            connection.query(cardsInSetSQL, [setId], (err, cardsResult) => {
                if (err) throw err;

                // Render the set details page with the set data and card data
                res.render('sets/setsdetails', {
                    set: result[0],
                    cardsInSet: cardsResult
                });
            });
        }
    });
});

module.exports = router;
