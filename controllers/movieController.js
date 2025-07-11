import { Movie } from "../models/movieSchema.js";
import { ApiFeatures } from "../utils/ApiFeatures.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import fs from 'fs';
import { CustomError } from "../utils/CustomError.js";

import { cloudinary } from "../utils/cloudinary.js";


/* const getAllMovies = async (req, res, next) => {
  try {
        
    let queryObj = { ...req.query };
    console.log({queryObj})

    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match)=>`$${match}`);
    // console.log({queryStr});

    const filter = JSON.parse(queryStr);
    console.log({filter})

    // localhost:5555/all-movies/?duration[gte]=110
    let query = Movie.find(filter);

    // ?sort=name,-ratings
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    }else{
      query = query.sort("-createdAt");
    }

    // ?fields=name,genres,directors
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    }

    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const skip = (page - 1) * limit;

    const totalMoviesCount = await Movie.countDocuments();
    const totalPages = Math.ceil(totalMoviesCount / limit);

    if (page > totalPages && totalMoviesCount > 0) {
      return res.status(404).json({
        status: "fail",
        message: "No more data available.",
      });
    }

    query = query.skip(skip).limit(limit);

    const allMovies = await query;

    return res.status(200).json({
      status: "success",
      length: allMovies.length,
      totalMoviesCount,
      totalPages,
      currentPage: page,
      data: allMovies,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server Error" });
  }
}; */

// --------------------------------------------------------------------------------------------------------------------

const getAllMovies = async (req, res, next) => {
  // console.log("req.user",req.user);
  try {
    
    const baseQuery = Movie.find(); // return mongoose query object

    // creating instance of class.
    const apiFeatures = new ApiFeatures(baseQuery, req.query)
      .search()
      .filter()
      .sort()
      .limitFields();

    // Cloning query object before running countDocuments.
    // Mongoose queries can't be reused once run.
    const totalMoviesCount = await apiFeatures.query.clone().countDocuments();

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const totalPages = Math.ceil(totalMoviesCount / limit);

    /* 
      await apiFeatures.query.clone()  cloning the existing Mongoose query so it can be reused safely.
      Why is .clone() needed?
      Mongoose queries are not reusable once executed.

      So if you run this:
      await query.countDocuments(); // Query executed
      await query.find();    Error: Query was already executed

      To avoid this, we use .clone(): we are cloning apiFeatures.query
    */

    if (page > totalPages && totalMoviesCount > 0) {
      return res.status(404).json({
        status: "fail",
        message: "No more data available.",
      });
    }

    // Now run pagination on the original query
    apiFeatures.pagination();

    // Fetch paginated data
    const allMovies = await apiFeatures.query;

    if (allMovies.length === 0) {
        return res.status(404).json({
          status: "fail",
          message: "No movies found.",
        });
    }

    return res.status(200).json({
      status: "success",
      currentPage: page,
      totalPages: totalPages,
      result: allMovies.length,
      totalResults: totalMoviesCount,
      data: allMovies,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// --------------------------------------------------------------------------------------------------------------------

const getMovieStats = async (req, res, next) => {
  try {
    const movieStats = await Movie.aggregate([
      {
        $group: {
          _id: "$releaseYear",
          movieCount: { $sum: 1 },
          avgRatings: { $avg: "$ratings" },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalPrice: { $sum: "$price" },
        },
      },

      {
        $sort: { totalPrice: -1 },
      },
    ]);

    return res.status(200).json({
      status: "success",
      count: movieStats.length,
      data: movieStats,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// --------------------------------------------------------------------------------------------------------------------

const getMovieByGenre = async (req, res, next) => {
  try {
    const moviesByGenre = await Movie.aggregate([
      {
        $unwind: "$genres",
      },
      {
        $group: {
          _id: "$genres",
          movieCount: { $sum: 1 },
          movies: { $push: "$name" },
        },
      },
      {
        $addFields: { genre: "$_id" }, // on group stage we have _id which has genres like Action, Thriller
      },
      {
        $project: { _id: 0 }, // removed _id field
      },
      {
        $sort: { movieCount: -1 },
      },
      {
        $match: {
          genre: {
            $regex: new RegExp(`^${req.params.genre}$`, "i"), // case-insensitive exact match
          },
        },
      },
    ]);

    if (moviesByGenre.length === 0) {
      return res
        .status(404)
        .json({ message: "No movies found for this genre." });
    }

    return res.status(200).json({
      status: "success",
      length: moviesByGenre.length,
      data: moviesByGenre,
    });
  } catch (error) {
    return res.status(400).json({
      staus: "fail",
      message: error.message,
    });
  }
};

// --------------------------------------------------------------------------------------------------------------------

const createMovie = asyncErrorHandler(async (req, res, next) => {

  // console.log({createMovie: req.files});

  const uploadPromises = req.files.map(async(file) => {

    //  if we choose not an image file.
    if(!file.mimetype.startsWith('image/')){
      fs.unlinkSync(file.path);
      return next(new CustomError(`Invalid file type: ${file.originalname}`, 400));
    }

    // upload image to cloudinary
    const response =  await cloudinary.uploader.upload(file.path, {
      folder: "express-api-images"    // name of the folder on cloudinary service
    });

    // remove file from servers local path
    fs.unlinkSync(file.path);
    // return cloudinary response
    return response.secure_url
  });

  // if one image fails all images will be fail....
  const imageUrls = await Promise.all(uploadPromises);
  // console.log('imageUrls', imageUrls);

  const movie = await Movie.create(req.body);

  movie.coverImage = imageUrls;

  return res.status(201).json({
    status: "success",
    data: {
      movie,
    },
  });
});

// --------------------------------------------------------------------------------------------------------------------

const getMovieById = asyncErrorHandler(async (req, res, next) => {
  
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    const error = new CustomError(`movie with ${req.params.id} not found!`, 404);
    return next(error);
  }

  return res.status(200).json({
    status: "success",
    data: {
      movie,
    },
  });
});

// --------------------------------------------------------------------------------------------------------------------

const updateMovieById = asyncErrorHandler(async (req, res, next) => {
  const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!updatedMovie) {
    const error = new CustomError(`movie with ${req.params.id} not found!`, 404);
    return next(error);
  }
  return res.status(200).json({
    status: "success",
    data: {
      movie: updatedMovie
    }
  })
});

// --------------------------------------------------------------------------------------------------------------------

const deleteMovieById = asyncErrorHandler(async (req, res, next) => {
  const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
  if(!deletedMovie){
    const error = new CustomError(`movie with ${req.params.id} not found!`, 404);
    return next(error);
  }
  return res.status(200).json({
    status: "success",
    data: {
      movie: deletedMovie
    }
  });
});

// --------------------------------------------------------------------------------------------------------------------

export { getAllMovies, getMovieStats, getMovieByGenre, createMovie, getMovieById, updateMovieById, deleteMovieById };
