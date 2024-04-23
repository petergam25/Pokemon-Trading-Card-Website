//node C:\Users\peter\Desktop\tradecard\API\insert_sets.js


const axios = require('axios');
const express = require("express");
const app = express();
const mysql = require("mysql2");

app.set("view engine", "ejs");

const connection = mysql.createConnection( 
   { 
      host: 'localhost',
      user: 'root',
      password: '',       // no password is needed for XAMPP
      database: 'tradecard', // this is the NAME of your DB 
      port: '3306',       // this PORT for XAMPP only
   }
);

connection.connect( (err) => { 
    if(err) {
        return console.log(err.message)
    }else{
        return console.log(`Connection to local MySQL DB.`)
    };
 });

 async function insertSetsFromAPI() {
    try {
         // Fetch data from the API
         const response = await axios.get('https://api.tcgdex.net/v2/en/sets/');

         // Log API response structure for debugging
         console.log('API Response:', response.data);
 
         // Iterate through sets and insert into database
         for (const set of response.data) {
             const { id, name, logo, symbol, cardCount } = set;
             const { total, official } = cardCount;
 
             // Handle undefined symbol and logo
             const sanitizedSymbol = symbol || ''; // Use empty string if symbol is undefined
             const sanitizedLogo = logo || ''; // Use empty string if logo is undefined
 
             // Add '.webp' extension to logo and symbol URLs if not empty
             const modifiedLogo = sanitizedLogo && sanitizedLogo !== '' ? (sanitizedLogo.endsWith('.webp') ? sanitizedLogo : sanitizedLogo + '.webp') : sanitizedLogo;
             const modifiedSymbol = sanitizedSymbol && sanitizedSymbol !== '' ? (sanitizedSymbol.endsWith('.webp') ? sanitizedSymbol : sanitizedSymbol + '.webp') : sanitizedSymbol;
 
             // Log extracted values for debugging
             console.log('Inserting set:', { id, name, modifiedLogo, modifiedSymbol, total, official });
 
             // Insert set into database
             await connection.execute(
                 `INSERT INTO sets (id, name, logo, symbol, cardCountTotal, CardCountOfficial) VALUES (?, ?, ?, ?, ?, ?)`,
                 [id, name, modifiedLogo, modifiedSymbol, total, official]
             );
         }
 
         console.log('Sets inserted successfully.');
         // Close MySQL connection after all inserts are done
         await connection.end();
     } catch (error) {
         console.error('Error inserting sets:', error);
     }
 }
 
 // Call the function to insert sets
 insertSetsFromAPI();