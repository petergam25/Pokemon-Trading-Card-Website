// Import Required Modules
const express = require('express');
const path = require('path');
const connection = require('./database'); // Import database connection

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware and Configuration
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the public directory

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
    res.render('home');
});

// ABOUT PAGE
app.get('/about', (req, res) => {
    res.render('about');
});

// Server Listening
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});