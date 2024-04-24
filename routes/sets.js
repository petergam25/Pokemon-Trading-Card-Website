const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// SETS PAGE
router.get('/', (req, res) => {
    const setsSQL = `SELECT id, name, logo, symbol, cardCountTotal, cardCountOfficial, cardCountReverse, cardCountHolo, cardCountFirstEd, series_ID, tcgOnline, releaseDate, legalStandard, legalExpanded FROM sets;`;

    connection.query(setsSQL, (err, result) => {
        if (err) throw err;
        res.render("sets", { setlist: result });
    });
});

// Handle search request for sets
router.get('/search', (req, res) => {
    let query = req.query.query; // Get the search query from URL params and trim whitespace

    // Use parameterized query to prevent SQL injection
    const searchSQL = 'SELECT * FROM sets WHERE name LIKE ?';
    const searchQuery = `%${query}%`; // Add wildcards to search for partial matches

    connection.query(searchSQL, [searchQuery], (err, result) => {
        if (err) throw err;
        // Render the sets page with the search results
        res.render('sets', { setlist: result });
    });
});

// SETS FILTERS
router.get('/filter', (req, res) => {
    const filter = req.query.sort;

    const setsSQL = `SELECT id, name, logo, symbol, cardCountTotal, cardCountOfficial, cardCountReverse, cardCountHolo, cardCountFirstEd, series_ID, tcgOnline, releaseDate, legalStandard, legalExpanded FROM sets ORDER BY ${filter};`;

    connection.query(setsSQL, (err, result) => {
        if (err) throw err;
        res.render('sets', { setlist: result });
    });
});

// SET DETAILS PAGE
router.get('/:setId', (req, res) => {
    const setId = req.params.setId; // Get the set ID from URL params

    // Query the database to fetch details of the specified set
    const setSQL = `SELECT * FROM sets WHERE id = ?`;
    connection.query(setSQL, [setId], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            // Handle case where set is not found
            res.status(404).send('Set not found - specific set');
        } else {
            // Render the set details page with the set data
            res.render('setdetails', { set: result[0] });
        }
    });
});

module.exports = router;
