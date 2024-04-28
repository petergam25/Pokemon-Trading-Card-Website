const express = require('express');
const router = express.Router();
const connection = require('../database'); // Import database connection
const bcrypt = require('bcrypt');

// REGISTER PAGE
router.get('/register', (req, res) => {
    // Initialize errorMessage
    const errorMessage = '';

    // Get displayName from session or set default value
    const displayName = req.session.displayName || '';

    // Get email from session or set default value
    const email = req.session.email || '';

    // Clear session variables after using them
    req.session.displayName = '';
    req.session.email = '';

    // Render the register page with required variables
    res.render("account/register", { isAuthenticated: req.session.authenticated, errorMessage, displayName, email });
});

// REGISTER
router.post('/register', (req, res) => {
    const { displayName, email, password } = req.body;

    req.session.displayName = displayName;
    req.session.email = email;

    if (password.length < 8) {
        const errorMessage = 'Password must be 8 characters or more.';
        return res.render('account/register', { isAuthenticated: req.session.authenticated, errorMessage, displayName, email });
    }

    // Check if displayName already exists in the database
    const checkDisplayNameQuery = 'SELECT * FROM users WHERE displayName = ?';

    connection.query(checkDisplayNameQuery, [displayName], async (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Registration failed. Please try again.');
        }

        // Check if displayName already exists
        if (rows.length > 0) {
            const errorMessage = 'Display Name already in use.';
            // Pass displayName and email to retain entered values
            return res.render('account/register', { isAuthenticated: req.session.authenticated, errorMessage, displayName, email });
        }

        // Proceed to check email
        const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
        connection.query(checkEmailQuery, [email], async (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Registration failed. Please try again.');
            }

            // Check if email already exists
            if (rows.length > 0) {
                const errorMessage = 'Email address already registered.';
                // Pass displayName and email to retain entered values
                return res.render('account/register', { isAuthenticated: req.session.authenticated, errorMessage, displayName, email });
            }

            try {
                // Hash the password using bcrypt
                const hashedPassword = await bcrypt.hash(password, 10); // 10 is the saltRounds value

                // If neither displayName nor email exists, proceed to insert new user with hashed password
                const insertUserQuery = 'INSERT INTO users (displayName, email, password) VALUES (?, ?, ?)';
                connection.query(insertUserQuery, [displayName, email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Registration failed. Please try again.');
                    }
                    console.log('Registration successful!');
                    res.redirect('/account/sign-in');
                });
            } catch (error) {
                console.error('Error hashing password:', error);
                return res.status(500).send('Registration failed. Please try again.');
            }
        });
    });
});


// SIGN-IN PAGE
router.get('/sign-in', (req, res) => {

    const errorMessage = '';

    res.render("account/sign-in", { isAuthenticated: req.session.authenticated, errorMessage })
});

// SIGN-IN
router.post('/sign-in', (req, res) => {
    const useremail = req.body.email;
    const userpassword = req.body.password; // Retrieve entered password from the request body

    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [useremail], async (err, rows) => {
        if (err) {
            console.error(err);
            const errorMessage = 'User not found';
            res.render("account/sign-in", { isAuthenticated: req.session.authenticated, errorMessage })
        }

        const numRows = rows.length;

        if (numRows > 0) {
            // User found, now compare passwords
            const hashedPasswordFromDB = rows[0].password;

            try {
                // Compare the entered password with the hashed password from the database
                const passwordMatch = await bcrypt.compare(userpassword, hashedPasswordFromDB);

                if (passwordMatch) {
                    req.session.authenticated = true;
                    req.session.user = rows[0].user_ID;
                    res.redirect('/');
                } else {
                    const errorMessage = 'Invalid password.';
                    res.render("account/sign-in", { isAuthenticated: req.session.authenticated, errorMessage })
                }
            } catch (error) {
                console.error('Error comparing passwords:', error);
                const errorMessage = 'Login failed. Please try again.';
                res.render("account/sign-in", { isAuthenticated: req.session.authenticated, errorMessage })
            }
        } else {
            const errorMessage = 'User not found.';
            res.render("account/sign-in", { isAuthenticated: req.session.authenticated, errorMessage })
        }
    });
});


// LOGOUT
router.get('/logout', (req, res) => {
    req.session.authenticated = false;
    res.redirect('/');
});

// SETTINGS PAGE
router.get('/settings', (req, res) => {

    if (req.session.authenticated) {
        console.log('Authenticated session detected');
        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE user_ID = "${uid}" `;

        connection.query(user, (err, row) => {
            const firstrow = row[0];
            res.render('account/settings', { isAuthenticated: req.session.authenticated, userdata: firstrow });
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
    const updateDisplayNameQuery = 'UPDATE users SET displayName = ? WHERE user_ID = ?';

    connection.query(updateDisplayNameQuery, [newDisplayName, userId], (err, result) => {
        if (err) {
            console.error('Error updating display name:', err);
            console.log('Error');
            return res.status(500).send('Failed to update display name');
        }

        console.log('Display name updated successfully');
        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE user_ID = "${uid}" `;

        connection.query(user, (err, row) => {
            const firstrow = row[0];
            res.render('account/settings', { isAuthenticated: req.session.authenticated, userdata: firstrow });
        });
    });
});

module.exports = router;