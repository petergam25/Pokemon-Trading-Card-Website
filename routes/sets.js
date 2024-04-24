const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// Combined Route for Default, Search, and Filter
router.get('/', (req, res) => {

    const query = req.query.query;
    const sort = req.query.sort;
    const order = req.query.order;

    // Define the base SQL query for sets
    let setsSQL = 'SELECT * FROM sets';

    // Check if there's a search query
    if (query) {
        const searchQuery = `%${query}%`;
        setsSQL += ` WHERE name LIKE '${searchQuery}'`; // Add search condition
    }

    // Check if there's a sort
    if (sort) {
        setsSQL += ` ORDER BY ${sort}`; // Add sort condition
    } else {
        setsSQL += ` ORDER BY series_ID`;
    }

    // Check if there's an order and it's valid (asc or desc)
    if (order && (order.toLowerCase() === 'asc' || order.toLowerCase() === 'desc')) {
        setsSQL += ` ${order.toUpperCase()}`; // Add ASC or DESC to the sort condition
    } else {
        setsSQL += ' ASC'; // Default to ascending order if order parameter is invalid or null
    }

    console.log('Query: ', query);
    console.log('Sort: ', sort);
    console.log('Order: ', order);

    console.log(setsSQL);

    // Execute the final SQL query
    connection.query(setsSQL, (err, result) => {
        if (err) throw err;
        res.render('sets', { setlist: result, currentQuery: query, currentSort: sort, currentOrder: order}); // Pass currentFilter to the view
    });
});

/*
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
*/

module.exports = router;
