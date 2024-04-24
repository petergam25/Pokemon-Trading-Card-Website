const mysql = require("mysql2");

// Database Connection Pool
const db = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tradecard',  // change to your DB name
    port: '3306'
});

// Connect to MySQL database
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to MySQL database successfully!');
        // Release the connection
        connection.release();
    }
});

module.exports = db;
