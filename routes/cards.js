const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    // Define route handlers using the 'connection' object
    // Example:
    router.get('/', (req, res) => {
        // Use 'connection' to query the database
        res.send('cards');
    });

    return router;
};