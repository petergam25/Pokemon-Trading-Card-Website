//node C:\Users\peter\Desktop\tradecard\API\populateDB.js

/*
const axios = require('axios');
const express = require("express");
const app = express();
const mysql = require("mysql2");

app.set("view engine", "ejs");
*/

const axios = require('axios');
const mysql = require('mysql2/promise');

// Create a pool of connections
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tradecard',
    port: '3306',
});

/*
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
*/



async function insertSetsFromAPI() {
    let connection;

    try {
        // Get a connection from the pool
        connection = await pool.getConnection();

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
    } finally {
        // Release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
}

async function insertCardsFromAPI() {
    let connection;

    try {
        // Get a connection from the pool
        connection = await pool.getConnection();

        // Fetch set IDs from the first API
        const response = await axios.get('https://api.tcgdex.net/v2/en/cards/');
        const cardIds = response.data.map(card => card.id);

        // Iterate through card IDs to fetch detailed info
        for (const cardId of cardIds) {
            try {
                // Fetch detailed info for each card ID from the second API
                const detailedResponse = await axios.get(`https://api.tcgdex.net/v2/en/cards/${cardId}`);
                const cardData = detailedResponse.data;

                // Extract relevant data from detailed response
                const {
                    category,
                    id,
                    illustrator,
                    image,
                    name,
                    rarity,
                    set: { id: setId },
                    variants: { firstEdition, holo, normal, reverse },
                    hp,
                    types = [],
                    evolveFrom,
                    description,
                    stage,
                    attacks = [],
                    weaknesses: { type, value },
                    retreat,
                } = cardData;

                // Handle undefined fields

                // Append '.webp' to image URL if not empty
                const modifiedImage = image ? (image.endsWith('.webp') ? image : image + '/high.webp') : '';

                // Use a default image if image field is empty
                const defaultImage = 'https://assets.tcgdex.net/en/base/base1/logo.webp';
                const finalImage = modifiedImage || defaultImage;

                const { weaknesses } = cardData;
                const weaknessType = weaknesses && weaknesses.type ? weaknesses.type : '';
                const weaknessValue = weaknesses && weaknesses.value ? weaknesses.value : '';

                // Insert card into database
                await connection.execute(
                    `INSERT INTO cards (id, name, image, category, illustrator, rarity, variantsNormal, variantsReverse, variantsHolo, variantsFirstEdition, set_ID, hp, evolveFrom, description, stage, type, retreat, weakness_type, weakness_value) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        name,
                        finalImage,
                        category || '',
                        illustrator || '',
                        rarity || '',
                        normal !== undefined ? normal : 0,
                        reverse !== undefined ? reverse : 0,
                        holo !== undefined ? holo : 0,
                        firstEdition !== undefined ? firstEdition : 0,
                        setId,
                        hp !== undefined ? hp : 0,
                        evolveFrom || '',
                        description || '',
                        stage || '',
                        types.join(',') || '',
                        retreat || 0,
                        weaknessType,
                        weaknessValue,
                    ]
                );

                for (const attack of attacks) {
                    const { cost, name: attackName, effect, damage } = attack;

                    // Check if cost is defined and is an array before joining
                    const joinedCost = Array.isArray(cost) ? cost.join(',') : '';

                    try {
                        await connection.execute(
                            `INSERT INTO pokemon_attacks (card_id, cost, attack_name, effect, damage) VALUES (?, ?, ?, ?, ?)`,
                            [
                                id,
                                joinedCost,
                                attackName,
                                effect || '',
                                damage || 0]
                        );
                    } catch (error) {
                        console.error('Error inserting ability:', attack, error.message);
                    }
                }


            } catch (error) {
                console.error('Error inserting card:', cardId, error.message);
                // Handle the error as needed, such as logging, skipping, or retrying
                // Here we continue to the next iteration (skipping the current card)
                continue;
            }
        }
        console.log('Cards inserted successfully.');

    } catch (error) {
        console.error('Error inserting cards:', error);
    } finally {
        // Release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
}






// Call the function to insert sets
//insertSeriesFromAPI();
//insertSetsFromAPI();
insertCardsFromAPI();

//node C:\Users\peter\Documents\GitHub\tradecard\API\populateDB.js