//node C:\Users\peter\Desktop\tradecard\API\populateDB.js


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
            const sanitizedLogo = logo || ''; // Use default image if string empty

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

async function insertSetsFromAPI() {
    try {
        // Fetch set IDs from the first API
        const response = await axios.get('https://api.tcgdex.net/v2/en/sets/');
        const setIds = response.data.map(set => set.id);

        // Log set IDs for debugging
        console.log('Set IDs:', setIds);

        // Iterate through set IDs to fetch detailed info
        for (const setId of setIds) {
            // Fetch detailed info for each set ID from the second API
            const detailedResponse = await axios.get(`https://api.tcgdex.net/v2/en/sets/${setId}`);

            // Extract relevant data from detailed response
            const { id, name, logo, symbol, serie, cardCount, releaseDate, legal, tcgOnline } = detailedResponse.data;
            const { firstEd, holo, normal, official, reverse, total } = cardCount;
            const { expanded, standard } = legal;

            // Handle undefined fields
            const defaultLogoUrl = 'https://assets.tcgdex.net/en/base/base1/logo.webp';
            const sanitizedLogo = logo || ''; // Use default image if string empty
            const modifiedLogo = sanitizedLogo ? (sanitizedLogo.endsWith('.webp') ? sanitizedLogo : sanitizedLogo + '.webp') : defaultLogoUrl;
            const modifiedSymbol = symbol ? (symbol.endsWith('.webp') ? symbol : symbol + '.webp') : '';

            const sanitizedTcgOnline = tcgOnline || ''; // Convert undefined to empty

            // Log extracted values for debugging
            console.log('Inserting set:', { id, name, modifiedLogo, serie, releaseDate, legal, tcgOnline, cardCount });

            // Insert set into database
            await connection.execute(
                `INSERT INTO sets (id, name, logo, symbol, cardCountTotal, cardCountOfficial, cardCountReverse, cardCountHolo, cardCountFirstEd, series_ID, tcgOnline, releaseDate, legalStandard, legalExpanded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, name, modifiedLogo, modifiedSymbol, total, official, reverse, holo, firstEd, serie.id, sanitizedTcgOnline, releaseDate, standard, expanded]
            );
        }

        console.log('Sets inserted successfully.');

    } catch (error) {
        console.error('Error inserting sets:', error);
    }
}


// Call the function to insert sets
//insertSeriesFromAPI();
insertSetsFromAPI();


//node C:\Users\peter\Desktop\tradecard\API\populateDB.js