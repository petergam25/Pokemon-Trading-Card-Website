const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// SERIES PAGE
router.get('/', (req, res) => {
    const seriesSQL = `SELECT id, name, logo FROM series;`;

    connection.query(seriesSQL, (err, result) => {
        if (err) throw err;
        res.render("series/series", { serieslist: result });
    });
});

// SERIES DETAILS PAGE
router.get('/:seriesId', (req, res) => {
    const seriesId = req.params.seriesId; // Get the series ID from URL params

    // Query the database to fetch details of the specified series
    const seriesSQL = `SELECT * FROM series WHERE id = ?`;
    const setsInSeriesSQL = 'SELECT * FROM sets WHERE series_ID = ?';

    connection.query(seriesSQL, [seriesId], (err, seriesResult) => {
        if (err) throw err;
        if (seriesResult.length === 0) {
            // Handle case where series is not found
            res.status(404).send('Series not found');
        } else {
            // Query the database to fetch all sets belonging to the series
            connection.query(setsInSeriesSQL, [seriesId], (err, setsResult) => {
                if (err) throw err;

                // Render the series details page with the series and sets data
                res.render('series/seriesdetails', {
                    series: seriesResult[0], // Pass series details
                    sets: setsResult // Pass sets belonging to the series
                });
            });
        }
    });
});

// Export the router object
module.exports = router;
