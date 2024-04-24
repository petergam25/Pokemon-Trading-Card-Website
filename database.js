const mysql = require("mysql2");

// Database Connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tradecard',
    port: '3306',
});

// Connect to MySQL database
connection.connect((err) => {
    if (err) {
        return console.log(err.message);
    }
    console.log(`Connection to local MySQL DB.`);
});

module.exports = connection;