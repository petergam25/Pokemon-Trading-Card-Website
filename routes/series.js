const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// SERIES PAGE
router.get('/', (req, res) => {

    const query = req.query.query || ''; // Default query to blank

    const seriesSQL = `SELECT * FROM series WHERE name LIKE ?;`;

    console.log(seriesSQL);

    connection.query(seriesSQL, [`%${query}%`], (err, result) => {
        if (err) throw err;
        res.render("series/series", {
            user: req.session.user,
            displayName: req.session.displayName,
            serieslist: result,
            currentQuery: query,
        });
    });
});

// SERIES DETAILS PAGE
router.get('/:seriesId', (req, res) => {
    const seriesId = req.params.seriesId; // Get the series ID from URL params

    // Query the database to fetch details of the specified series
    const seriesSQL = `
    SELECT * 
    FROM series 
    WHERE id = ?`;
    connection.query(seriesSQL, [seriesId], (err, seriesResult) => {
        if (err) throw err;
        if (seriesResult.length === 0) {
            // Handle case where series is not found
            res.status(404).send('Series not found');
        } else {

            // Query the database to fetch all sets belonging to the series
            const setsInSeriesSQL = `
            SELECT sets.*, COUNT(cards.id) AS cardCountTotal
            FROM sets
            LEFT JOIN cards ON sets.id = cards.set_ID
            WHERE sets.series_ID = ?
            GROUP BY sets.id
            ORDER BY sets.releaseDate ASC`;
            connection.query(setsInSeriesSQL, [seriesId], (err, setsResult) => {
                if (err) throw err;

                // Render the series details page with the series data and set data
                res.render('series/seriesdetails', {
                    user: req.session.user,
                    displayName: req.session.displayName,
                    series: seriesResult[0],
                    setsList: setsResult
                });
            });
        }
    });
});

module.exports = router;
