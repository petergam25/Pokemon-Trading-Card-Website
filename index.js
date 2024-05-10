// Import Required Modules
const express = require('express');
const sessions = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const oneHour = 1000 * 60 * 60 * 1;

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware and Configuration
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the public directory
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(flash());
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
const collectionRoutes = require('./routes/collections')

// Mount routes
app.use('/cards', cardsRoutes);
app.use('/sets', setsRoutes);
app.use('/series', seriesRoutes);
app.use('/account', accountRoutes);
app.use('/collections', collectionRoutes);

// HOME PAGE
app.get('/', (req, res) => {

    if (req.session.user) {
        res.redirect('dashboard');
    } else {
        const user = req.session.user;
        const displayName = req.session.displayName;
        res.render('home', { user, displayName });
    }
});

// DASHBOARD
app.get('/dashboard', (req, res) => {

    if (req.session.user) {
        const user = req.session.user;
        const displayName = req.session.displayName;
        res.render('dashboard', { user, displayName });
    } else {
        res.send('You must be logged in to view this page.');
    }

});

// Server Listening
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});