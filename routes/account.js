const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// REGISTER PAGE
router.get('/register', (req, res) => {
    // Initialize blank error message
    const errorMessage = '';
    res.render("account/register", { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
});

// REGISTER
router.post('/register', [
    body('displayName').trim().isLength({ min: 5, max: 10 }).withMessage('Display Name must be 5 to 10 characters long.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Invalid email format.'),
    body('password').trim().isLength({ min: 8 }).withMessage('Password must be 8 characters or more.')
], async (req, res) => {

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array()[0].msg;
        return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
    }

    const { displayName, email, password } = req.body;

    // Check if displayName already exists in the database
    const checkDisplayNameQuery = 'SELECT * FROM users WHERE displayName = ?';
    connection.query(checkDisplayNameQuery, [displayName], async (err, rows) => {
        // General error from database query
        if (err) {
            const errorMessage = 'Registration failed during display name check. Please try again.';
            return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
        }

        // Check if displayName already exists
        if (rows.length > 0) {
            const errorMessage = 'Display Name already in use.';
            return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
        }

        // Proceed to check if email already exists in the database
        const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
        connection.query(checkEmailQuery, [email], async (err, rows) => {
            // General error from database query
            if (err) {
                const errorMessage = 'Registration failed during email check. Please try again.';
                return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
            }

            // Check if email already exists
            if (rows.length > 0) {
                const errorMessage = 'Email address already registered.';
                return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
            }

            try {
                // Hash the password using bcrypt
                const hashedPassword = await bcrypt.hash(password, 10); // 10 is the saltRounds value

                // Insert new user with hashed password
                const insertUserQuery = 'INSERT INTO users (displayName, email, password) VALUES (?, ?, ?)';
                connection.query(insertUserQuery, [displayName, email, hashedPassword], (err, result) => {
                    if (err) {
                        const errorMessage = 'Registration failed during database insertion. Please try again.';
                        return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
                    }

                    // Successful registration
                    console.log('New user registered: ', [displayName, email, hashedPassword]);
                    const errorMessage = '';
                    return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage });
                });
            } catch (error) {
                console.error('Error hashing password:', error);
                const errorMessage = 'Registration failed during password hasing. Please try again.';
                return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
            }
        });
    });
});

// SIGN-IN PAGE
router.get('/sign-in', (req, res) => {
    // Initialise blank error message
    const errorMessage = '';
    res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage })
});

//SIGN-IN
router.post('/sign-in', [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be 8 characters or more.')
], async (req, res) => {

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('account/sign-in', { user: req.session.user, displayName: req.session.displayName, errorMessage: errors.array()[0].msg });
    }

    const useremail = req.body.email;
    const userpassword = req.body.password;

    // Find user in database
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [useremail], async (err, rows) => {
        //General error from database query
        if (err) {
            const errorMessage = 'Error querying database.';
            return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage });
        }

        // Check if user exists
        if (rows.length > 0) {
            // User found
            const hashedPasswordFromDB = rows[0].password;

            // Compare the entered password with the hashed password from the database
            try {
                console.log('Trying to compare...');
                const passwordMatch = await bcrypt.compare(userpassword, hashedPasswordFromDB);

                if (passwordMatch) {
                    // Successful login
                    req.session.user = rows[0].user_ID;
                    req.session.displayName = rows[0].displayName;
                    console.log('Display name:', req.session.displayName);
                    console.log('User ID: ', req.session.user);
                    console.log('Successful login.')
                    return res.redirect('/dashboard');
                } else {
                    // Passwords do not match
                    const errorMessage = 'Invalid password.';
                    return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage });
                }
            } catch (error) {
                console.error('Error comparing passwords:', error);
                const errorMessage = 'Login failed. Please try again.';
                return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage });
            }
        } else {
            // User not found
            const errorMessage = 'User not found.';
            return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage });
        }
    });
});

// LOGOUT
router.get('/logout', (req, res) => {
    req.session.user = '';
    req.session.displayName = '';
    res.redirect('/');
});

// SETTINGS PAGE
router.get('/settings', (req, res) => {
    console.log(req.session.displayName);
    console.log(req.session.user);

    if (req.session.user) {
        const errorMessage = '';
        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE user_ID = "${uid}" `;

        connection.query(user, (err, row) => {
            const firstrow = row[0];
            console.log(firstrow);
            res.render('account/settings', { user: req.session.user, displayName: req.session.displayName, userdata: firstrow, errorMessage });
        });
    } else {
        console.log('Unauthorized access to settings page.');
        res.status(403).send('You must be logged in to view this page.');
    }
});

// CHANGE DISPLAY NAME
router.post('/update-display-name', [
    body('newDisplayName').trim().isLength({ min: 5, max: 10 }).withMessage('Display Name must be 5 to 10 characters long.')
], async (req, res) => {

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE user_ID = "${uid}" `;
        connection.query(user, (err, row) => {
            const firstrow = row[0];
            console.log(firstrow);
            return res.status(400).render('account/settings', { user: req.session.user, displayName: req.session.displayName, userdata: firstrow, errorMessage: errors.array()[0].msg });
        });
    } else {

        const userId = req.session.user;
        const newDisplayName = req.body.newDisplayName;

        // Proceed with updating display name in the database
        const updateDisplayNameQuery = 'UPDATE users SET displayName = ? WHERE user_ID = ?';

        connection.query(updateDisplayNameQuery, [newDisplayName, userId], (err, result) => {
            if (err) {
                console.error('Error updating display name:', err);
                return res.status(500).send('Failed to update display name');
            }

            req.session.displayName = newDisplayName; // Update session display name
            console.log('Display name updated successfully');
            res.redirect('/account/settings'); // Redirect to settings page or another appropriate page
        });
    }
});


module.exports = router;