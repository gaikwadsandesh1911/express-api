import mongoose from 'mongoose';
import fs from 'fs';
import { Movie } from '../models/movieSchema.js';
import dotenv from 'dotenv';
dotenv.config();

// connect to db
mongoose.connect("", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected successfully to DB"))
    .catch(err => console.log(err));

// read movies.json file
const movies = JSON.parse(fs.readFileSync("./movies.json", 'utf-8'));

// delete all previous data from db
const deleteMovies = async () => {
    try {
        await Movie.deleteMany();
        console.log('Deleted movies successfully');
    } catch (error) {
        console.log("Error while deleting", error);
    }
};

// import movies from json file
const importData = async () => {
    try {
        await Movie.create(movies);
        console.log('Added movies successfully');
        process.exit(); // Exit the process successfully
    } catch (error) {
        console.log("Error while importing movies", error);
        process.exit(1); // Exit with failure
    }
};

// sequential execution
const run = async () => {
    await deleteMovies();
    await importData();
};

run();

/*
    To run the file:
    node moveToDB.js
*/
