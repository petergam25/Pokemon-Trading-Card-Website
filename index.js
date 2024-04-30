// Import Required Modules
const express = require('express');
const sessions = require('express-session');
const path = require('path');
const connection = require('./database'); // Import database connection
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const oneHour = 1000 * 60 * 60 * 1;

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware and Configuration
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the public directory
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessions({
    secret: "myshows14385899",
    saveUninitialized: true,
    cookie: { maxAge: oneHour },
    resave: false
}));

// Import Routes
const cardsRoutes = require('./routes/cards');
const setsRoutes = require('./routes/sets');
const seriesRoutes = require('./routes/series');
const accountRoutes = require('./routes/account');

// Mount routes
app.use('/cards', cardsRoutes);
app.use('/sets', setsRoutes);
app.use('/series', seriesRoutes);
app.use('/account', accountRoutes);

// HOME PAGE
app.get('/', (req, res) => {
    console.log(req.session)
    console.log(req.session.user);
    res.render('home', { isAuthenticated: req.session.authenticated, user: req.session.user });
});

// ABOUT PAGE
app.get('/dashboard', (req, res) => {
    const uid = req.session.user;
    const user = `SELECT * FROM users WHERE user_ID = "${uid}" `;

    connection.query(user, (err, row) => {
        const firstrow = row[0];
        res.render('dashboard', { isAuthenticated: req.session.authenticated, user: req.session.user, userdata: firstrow });
    });
});

// Server Listening
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});