const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// SERIES PAGE
router.get('/', (req, res) => {
  const seriesSQL = `SELECT id, name, logo FROM series;`;

  connection.query(seriesSQL, (err, result) => {
    if (err) throw err;
    res.render("series", { serieslist: result });
  });
});

module.exports = router;
