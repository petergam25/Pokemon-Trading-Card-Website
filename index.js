const express = require('express');
const app = express();
const mysql = require("mysql2");
const path = require('path');
const { resourceLimits } = require('worker_threads');
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

const connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'tradecard',
        port: '3306',
    }
);

connection.connect((err) => {
    if (err) {
        return console.log(err.message)
    } else {
        return console.log(`Connection to local MySQL DB.`)
    };
});

// HOME PAGE
app.get('/', (req, res) => {
    res.render('home');
});

// ABOUT PAGE
app.get('/about', (req, res) => {
    res.render('about');
});

// SETS PAGE
app.get('/sets', (req, res) => {

    const setsSQL = `SELECT id, name, logo, symbol, cardCountTotal, cardCountOfficial from sets; `;

    connection.query(setsSQL, (err, result) => {
        if (err) throw err;
        res.render("sets", { setlist: result });
    });
});

app.get('/filter', (req, res) => {
    const filter = req.query.sort;

    const burgersSQL = `SELECT id, name, logo, symbol, cardCountTotal, cardCountOfficial from sets ORDER BY ${filter}; `;

    connection.query(burgersSQL, (err, result) => {
        if (err) throw err;
        res.render('sets', { setlist: result });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
