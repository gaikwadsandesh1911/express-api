import mongoose, { Schema } from "mongoose";
import fs from "fs";

// import validator from "validator";

const movieSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required!"],
      unique: true,
      trim: true, // extra white-space is removed before and after string
      // select: false   // this property will not be shown
      minlength: [2, "movie name must be atleast 2 character"],
      maxlenght: [100, "movie name must not have more than 100 characters"],

      // validator libray
      // validate: [validator.isAlpha, "Name should contain alphabate only."] //  isAlpha => space between world not allowed
    },
    description: {
      type: String,
      required: [true, "description is required!"],
      trim: true, // extra white-space is removed before and after string
    },
    duration: {
      type: String,
      required: true,
    },
    ratings: {
      type: Number,
      // min: 1,      // built-in validation
      // max: 10      // built-in validation

      //  custom validation
      validate: {
        validator: function (value) {
          // return this.ratings >= 1 && value <= 10;     // will work with creating document only not with updating document
          return value >= 1 && value <= 10; // work with creating as well updating document.
        },
        message: "rating must be above 0 and below 11!",
        // message:  props => `${props.value} is out of range`
      },

    },
    totalRating: {
      type: Number,
    },
    releaseYear: {
      type: Number,
      required: [true, "release year is required field!"],
    },
    releaseDate: {
      type: Date,
    },
    genres: {
      type: [String], // string array
      required: [true, "genres is required field!"],
      enum: {
        values: [
          "Action",
          "Adventure",
          "Thriller",
          "Sci-Fi",
          "Crime",
          "Drama",
          "Comedy",
          "Romance",
          "Biography",
        ],
        message: "This genre does not exist.",
      },
    },
    directors: {
      type: [String],
      required: [true, "directors is required field!"],
    },
    actors: {
      type: [String],
      required: [true, "actors is required field!"],
    },
    coverImage: {
      type: [String],
      required: [true, "cover image is required field!"],
    },
    price: {
      type: Number,
      required: [true, "price is required field!"],
    },

    // pre() hook
    createdBy: {
      type: String,
    },
  },
  
  { timestamps: true }
);

// -------------------------------------------------------------------------------------------------------------

movieSchema.virtual("durationInHours").get(function () {
  return this.duration / 60;
});

movieSchema.set('toJSON', { virtuals: true } );
movieSchema.set('toObject', { virtuals: true } );

// ------------------------------------------------------------------------------------------------------------

movieSchema.pre("save", function (next) {
  // console.log('pre', this)        // this means document being process.
  this.createdBy = this.name; // createdBy must be present on mongoose modalSchema
  next();
});

/* movieSchema.post("save", function (doc, next) {
  // post hook callback function dosen't have access to this keyowrd, isntead it has doc means currently saved document
  const content = `"${doc.name}" has been created by "${doc.createdBy}" \n`;
  fs.writeFileSync("./Log/log.txt", content, { flag: "a" }, (err) => {
    console.log("post hook error", err.message);
  });
  // {flag: 'a'}  => means append new document to existing document
  next();
}); */

movieSchema.pre(/^find/, function (next) {
  // this return current query object return by mongoose on find method. we can chain another query method provided by mongoose
  this.find({ releaseYear: { $lte: new Date().getFullYear() } });
  next();
});

// ------------------------------------------------------------------------------------------------------------
// aggregate middleware

movieSchema.pre("aggregate", function (next) {
  // console.log('aggregate this =>', this.pipeline())
  this.pipeline().unshift({
    $match: { releaseYear: { $lte: new Date().getFullYear() } },
  });
  next();
});

// this.pipeline() return an array.. unshift() means at first position we want to add new stage

// ------------------------------------------------------------------------------------------------------------
// create a compound text index.
movieSchema.index({name: "text"});
/* 
    1. creates a MongoDB text index on the name field
    2. It enables full-text search on that specific field using the $text operator.
    3. it performs case-insensitive, word-based searches
*/
// movieSchema.index({name: "text", description: "text"});

// ------------------------------------------------------------------------------------------------------------

export const Movie = mongoose.model("movies", movieSchema);


//  movieSchema.pre('save').... 'save' event happens when we call save() or create() method of mongoose from our express app.