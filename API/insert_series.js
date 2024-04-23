//node C:\Users\peter\Desktop\tradecard\API\insert_series.js


const axios = require('axios');
const express = require("express");
const app = express();
const mysql = require("mysql2");

app.set("view engine", "ejs");

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

async function insertSeriesFromAPI() {
    try {
        // Fetch data from the API
        const response = await axios.get('https://api.tcgdex.net/v2/en/series');

        // Log API response structure for debugging
        console.log('API Response:', response.data);

        // Iterate through series and insert into database
        for (const series of response.data) {
            const { id, name, logo } = series;


            // Handle undefined symbol and logo
            const sanitizedLogo = logo || ''; // Use empty string if logo is undefined

            // Add '.webp' extension to logo and symbol URLs if not empty
            const modifiedLogo = sanitizedLogo && sanitizedLogo !== '' ? (sanitizedLogo.endsWith('.webp') ? sanitizedLogo : sanitizedLogo + '.webp') : sanitizedLogo;

            // Log extracted values for debugging
            console.log('Inserting series:', { id, name, modifiedLogo });

            // Insert series into database
            await connection.execute(
                `INSERT INTO series (id, name, logo) VALUES (?, ?, ?)`,
                [id, name, modifiedLogo]
            );
        }

        console.log('Series inserted successfully.');
        // Close MySQL connection after all inserts are done
        await connection.end();
    } catch (error) {
        console.error('Error inserting series:', error);
    }
}

// Call the function to insert series
insertSeriesFromAPI();