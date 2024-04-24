const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection

// CREATE AN ACCOUNT
router.get('/create', (req, res) => {

    res.render("account/register")
});

// SIGN IN
router.get('/sign-in', (req, res) => {

    res.render("account/sign-in")
});

module.exports = router;
