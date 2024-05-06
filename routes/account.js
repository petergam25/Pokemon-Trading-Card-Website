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
                // Create a new collection for the user
                const insertCollectionQuery = 'INSERT INTO collection (id) VALUES (NULL)';
                connection.query(insertCollectionQuery, async (err, collectionResult) => {
                    if (err) {
                        // Handle collection insertion error
                        console.error('Error inserting collection:', err);
                        // Render an error page or return an error response
                        return res.status(500).send('Error inserting collection');
                    }

                    // Get the ID of the newly created collection
                    const collectionId = collectionResult.insertId;

                    // Create a new wishlist for the user
                    const insertWishlistQuery = 'INSERT INTO wishlist (id) VALUES (NULL)';
                    connection.query(insertWishlistQuery, async (err, wishlistResult) => {
                        if (err) {
                            // Handle wishlist insertion error
                            console.error('Error inserting wishlist:', err);
                            // Render an error page or return an error response
                            return res.status(500).send('Error inserting wishlist');
                        }

                        // Get the ID of the newly created wishlist
                        const wishlistId = wishlistResult.insertId;

                        // Hash the password using bcrypt
                        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the saltRounds value

                        // Insert new user with collection_id and wishlist_id
                        const insertUserQuery = 'INSERT INTO users (displayName, email, password, collection_id, wishlist_id) VALUES (?, ?, ?, ?, ?)';
                        connection.query(insertUserQuery, [displayName, email, hashedPassword, collectionId, wishlistId], async (err, userResult) => {
                            if (err) {
                                // Handle user insertion error
                                console.error('Error inserting user:', err);
                                // Render an error page or return an error response
                                return res.status(500).send('Error inserting user');
                            }

                            // Registration successful
                            console.log('New user registered:', [userResult]);
                            return res.render("account/sign-in", { user: req.session.user, displayName: req.session.displayName, errorMessage: '' });
                        });
                    });
                });
            } catch (error) {
                console.error('Error hashing password:', error);
                const errorMessage = 'Registration failed during password hashing. Please try again.';
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

    if (req.session.user) {
        const errorMessage = '';
        const successMessage = '';
        const uid = req.session.user;
        const user = `SELECT * FROM users WHERE user_ID = "${uid}" `;

        connection.query(user, (err, row) => {
            const firstrow = row[0];
            res.render('account/settings', { user: req.session.user, displayName: req.session.displayName, userdata: firstrow, errorMessage, successMessage });
        });
    } else {
        console.log('Unauthorized access to settings page.');
        res.status(403).send('You must be logged in to view this page.');
    }
});

// UPDATE DISPLAY NAME
router.post('/update-display-name', [
    body('newDisplayName').trim().isLength({ min: 5, max: 10 }).withMessage('Display Name must be 5 to 10 characters long.'),
    body('currentPassword').trim().notEmpty().withMessage('Current Password is required.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Validation errors
        renderSettingsWithError(req, res, errors.array()[0].msg, '');

    } else {
        const userId = req.session.user;
        const newDisplayName = req.body.newDisplayName;
        const currentPassword = req.body.currentPassword;

        // Check if the current password matches the user's actual password
        const checkPasswordQuery = 'SELECT * FROM users WHERE user_ID = ?';
        connection.query(checkPasswordQuery, [userId], async (err, rows) => {
            if (err) {
                console.error('Error checking password:', err);
                return res.status(500).send('Error checking password', '');
            }
            if (rows.length === 0) {
                // User not found
                renderSettingsWithError(req, res, 'User not found.', '');
            }

            const hashedPasswordFromDB = rows[0].password;

            // Compare the entered password with the hashed password from the database using bcrypt
            try {
                const passwordMatch = await bcrypt.compare(currentPassword, hashedPasswordFromDB);
                if (passwordMatch) {

                    // Check if the new display name already exists
                    const checkDisplayNameQuery = 'SELECT * FROM users WHERE displayName = ? AND user_ID != ?';
                    connection.query(checkDisplayNameQuery, [newDisplayName, userId], async (err, rows) => {
                        if (err) {
                            console.error('Error checking display name:', err);
                            return res.status(500).send('Error checking display name');
                        }

                        if (rows.length > 0) {
                            // Display name already exists
                            renderSettingsWithError(req, res, 'Display name already exists.', '');

                        } else {
                            // Proceed with updating display name
                            const updateDisplayNameQuery = 'UPDATE users SET displayName = ? WHERE user_ID = ?';
                            connection.query(updateDisplayNameQuery, [newDisplayName, userId], (err, result) => {
                                if (err) {
                                    console.error('Error updating display name:', err);
                                    return res.status(500).send('Failed to update display name');
                                }
                                req.session.displayName = newDisplayName;
                                renderSettingsWithError(req, res, '', 'Display name updated successfully!');
                            });
                        }
                    });
                } else {
                    // Passwords do not match
                    renderSettingsWithError(req, res, 'Incorrect password.', '');
                }
            } catch (error) {
                // Error comparing passwords
                renderSettingsWithError(req, res, 'An error occurred. Please try again.', '');
            }
        });
    }
});

// CHANGE EMAIL
router.post('/update-email', [
    body('newEmail').trim().isEmail().normalizeEmail().withMessage('Invalid email format.'),
    body('currentPassword').trim().notEmpty().withMessage('Current Password is required.')
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Validation errors
        renderSettingsWithError(req, res, errors.array()[0].msg, '');
    } else {
        const userId = req.session.user;
        const newEmail = req.body.newEmail;
        const currentPassword = req.body.currentPassword;

        // Check if the current password matches the user's actual password
        const checkPasswordQuery = 'SELECT * FROM users WHERE user_ID = ?';
        connection.query(checkPasswordQuery, [userId], async (err, rows) => {
            if (err) {
                console.error('Error checking password:', err);
                return res.status(500).send('Error checking password');
            }
            if (rows.length === 0) {
                // User not found
                renderSettingsWithError(req, res, 'User not found.', '');
            }

            const hashedPasswordFromDB = rows[0].password;

            // Compare the entered password with the hashed password from the database using bcrypt
            try {
                const passwordMatch = await bcrypt.compare(currentPassword, hashedPasswordFromDB);
                if (passwordMatch) {

                    // Check if the new email already exists
                    const checkEmailQuery = 'SELECT * FROM users WHERE email = ? AND user_ID != ?';
                    connection.query(checkEmailQuery, [newEmail, userId], (err, rows) => {
                        if (err) {
                            console.error('Error checking email:', err);
                            return res.status(500).send('Error checking email');
                        }

                        if (rows.length > 0) {
                            // Email already exists
                            renderSettingsWithError(req, res, 'Email address already in use.', '');
                        } else {
                            // Proceed with updating email in the database
                            const updateEmailQuery = 'UPDATE users SET email = ? WHERE user_ID = ?';
                            connection.query(updateEmailQuery, [newEmail, userId], (err, result) => {
                                if (err) {
                                    console.error('Error updating email:', err);
                                    return res.status(500).send('Failed to update email');
                                }
                                renderSettingsWithError(req, res, '', 'Email updated successfully!');
                            });
                        }
                    });
                } else {
                    // Passwords do not match
                    renderSettingsWithError(req, res, 'Incorrect password.', '');
                }
            } catch (error) {
                // Error comparing passwords
                renderSettingsWithError(req, res, 'An error occurred. Please try again.', '');
            }
        });
    }
});

// UPDATE PASSWORD
router.post('/update-password', [
    body('currentPassword').trim().notEmpty().withMessage('Current Password is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be 8 characters or more.')
], async (req, res) => {

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Validation errors
        renderSettingsWithError(req, res, errors.array()[0].msg, '');

    } else {
        const userId = req.session.user;
        const currentPassword = req.body.currentPassword;
        const newPassword = req.body.newPassword;

        // Check if the current password matches the user's actual password
        const checkPasswordQuery = 'SELECT * FROM users WHERE user_ID = ?';
        connection.query(checkPasswordQuery, [userId], async (err, rows) => {
            if (err) {
                console.error('Error checking password:', err);
                return res.status(500).send('Error checking password');
            }
            if (rows.length === 0) {
                // User not found
                renderSettingsWithError(req, res, 'User not found.', '');
            };

            const hashedPasswordFromDB = rows[0].password;

            // Compare the entered password with the hashed password from the database using bcrypt
            try {
                const passwordMatch = await bcrypt.compare(currentPassword, hashedPasswordFromDB);
                if (passwordMatch) {
                    // Hash the new password before updating in the database
                    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

                    // Proceed with updating password in the database
                    const updatePasswordQuery = 'UPDATE users SET password = ? WHERE user_ID = ?';
                    connection.query(updatePasswordQuery, [hashedNewPassword, userId], (err, result) => {
                        if (err) {
                            console.error('Error updating password:', err);
                            return res.status(500).send('Failed to update password');
                        }
                        renderSettingsWithError(req, res, '', 'Password updated successfully!');
                    });

                } else {
                    // Passwords do not match
                    renderSettingsWithError(req, res, 'Incorrect password.', '');

                }
            } catch (error) {
                // Error comparing passwords
                renderSettingsWithError(req, res, 'An error occurred. Please try again.', '');

            }
        });
    }
});

// Function to query user details and render settings page with error message
function renderSettingsWithError(req, res, errorMessage, successMessage) {
    const uid = req.session.user;
    const userQuery = `SELECT * FROM users WHERE user_ID = "${uid}" `;
    connection.query(userQuery, (err, row) => {
        const firstrow = row[0];
        return res.status(500).render('account/settings', { user: req.session.user, displayName: req.session.displayName, userdata: firstrow, errorMessage, successMessage });
    });
}

module.exports = router;