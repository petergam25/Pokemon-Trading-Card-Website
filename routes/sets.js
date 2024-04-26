const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// Combined Route for Default, Search, and Filter
router.get('/', (req, res) => {

    const query = req.query.query;
    const sort = req.query.sort || 'series_ID';
    const order = req.query.order || 'ASC'; // Default order to ASC

    // Define the base SQL queries
    let setsSQL = 'SELECT * FROM sets';
    let seriesSQL = `
        SELECT DISTINCT series.* 
        FROM series 
        JOIN sets ON series.id = sets.series_ID 
        WHERE sets.name LIKE '%${query}%'
        ORDER BY series.id
    `;

    // Sort by
    let setsSortSQL = ` ORDER BY ${sort}`;

    if (sort === 'series_ID'){
        setsSortSQL = ` ORDER BY releaseDate`;
    }

    // Order by
    let setsOrderSQL = '';
    if (order.toUpperCase() === 'DESC') {
        setsOrderSQL = ` DESC`;  // Append DESC if order is DESC
        seriesSQL += 'DESC';
    } else {
        setsOrderSQL = ` ASC`;   // Append ASC if order is ASC or any other value
        seriesSQL += ' ASC';
    }

    // If there is a search query
    if (query) {
        setsSQL = setsSQL + ` WHERE name LIKE '%${query}%'` + setsSortSQL + setsOrderSQL;
    } else {
        setsSQL = setsSQL + setsSortSQL + setsOrderSQL;
    }

    console.log('Sets SQL: ', setsSQL);
    console.log('Series SQL: ', seriesSQL);

    // Execute the final SQL query
    connection.query(setsSQL, (err, setList) => {
        if (err) throw err;

        connection.query(seriesSQL, (err, seriesList) => {
            if (err) throw err;
            res.render('sets/sets', { setlist: setList, seriesList: seriesList, currentQuery: query, currentSort: sort, currentOrder: order }); // Pass currentFilter to the view
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
                    set: result[0], // Set details
                    cardsInSet: cardsResult // Cards belonging to the series
                });
            });
        }
    });
});

module.exports = router;
