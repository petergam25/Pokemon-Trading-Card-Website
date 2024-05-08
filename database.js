const mysql = require("mysql2");
require('dotenv').config();

// Database Connection Pool
const db = mysql.createPool({
    host:       process.env.DB_HOST,
    user:       process.env.DB_USER,
    password:   process.env.DB_PW,
    database:   process.env.DB_NAME,
    port:       process.env.DB_PORT,
    waitForConnections: true,
    multipleStatements: true,
    connectionLimit: 10,
    queueLimit: 10,
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
