const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection
const bcrypt = require('bcrypt');

// REGISTER PAGE
router.get('/register', (req, res) => {
    // Initialize blank error message
    const errorMessage = '';
    res.render("account/register", { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
});

// REGISTER
router.post('/register', (req, res) => {
    const { displayName, email, password } = req.body;
    console.log(req.body.displayName);
    console.log(req.body.email);
    console.log(req.body.password);

    // Check display name meets specification
    if (displayName.length < 5 || displayName.length > 10) {
        console.log(req.body.displayName);
        console.log(req.body.email);
        console.log(req.body.password);
        const errorMessage = 'Display Name must be 5 to 10 characters long.';
        return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });

    }

    // Check password meets specification
    if (password.length < 8) {
        const errorMessage = 'Password must be 8 characters or more.';
        return res.render('account/register', { attemptedDisplayName: req.body.displayName, attemptedEmail: req.body.email, user: req.session.user, displayName: req.session.displayName, errorMessage });
    }

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
                    console.log('Registration successful!');
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

// SIGN-IN
router.post('/sign-in', async (req, res) => {
    const useremail = req.body.email;
    const userpassword = req.body.password;

    // Find user in database
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [useremail], async (err, rows) => {
        if (err) {
            const errorMessage = 'User not found';
            return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage });
        }

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
                    return res.redirect('/');
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
    res.render('home', { user: req.session.user, displayName: req.session.displayName });
});

// SETTINGS PAGE
router.get('/settings', (req, res) => {

    if (req.session.authenticated) {
        console.log('Authenticated session detected');
        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE displayName = "${uid}" `;

        connection.query(user, (err, row) => {
            const firstrow = row[0];
            res.render('account/settings', { user: req.session.user, userdata: firstrow });
        });
    } else {
        console.log('Unauthorized access to settings page.');
        res.status(403).send('Unauthorized');
    }
});

// Example route for updating display name
router.post('/update-display-name', (req, res) => {
    const userId = req.session.user; // Assuming you have user authentication and userId available in session
    const { newDisplayName } = req.body; // Assuming new display name is sent in the request body

    if (!userId || !newDisplayName) {
        return res.status(400).send('Invalid data received');
    }

    // Update display name in the database
    const updateDisplayNameQuery = 'UPDATE users SET displayName = ? WHERE displayName = ?';

    connection.query(updateDisplayNameQuery, [newDisplayName, userId], (err, result) => {
        if (err) {
            console.error('Error updating display name:', err);
            console.log('Error');
            return res.status(500).send('Failed to update display name');
        }

        req.session.user = newDisplayName;
        console.log('Display name updated successfully');
        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE displayName = "${uid}" `;
        console.log(user);

        connection.query(user, (err, row) => {
            const firstrow = row[0];
            console.log(firstrow);
            res.render('account/settings', { user: req.session.user, userdata: firstrow });
        });
    });
});

module.exports = router;