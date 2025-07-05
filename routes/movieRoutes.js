import { getAllMovies, getMovieStats, getMovieByGenre, createMovie, getMovieById, updateMovieById, deleteMovieById} from "../controllers/movieController.js";
import { protect, restrict } from "../controllers/authController.js";

import express from "express";
const router = express.Router();

router.get("/movies/all", protect, getAllMovies);
router.get("/movies/stats", getMovieStats);
router.get("/genre/:genre", getMovieByGenre);
router.post("/create", protect, createMovie);
router.get("/:id", getMovieById);
router.patch("/:id", updateMovieById);
router.delete("/:id", protect, restrict('admin', 'superAdmin'), deleteMovieById);

export default router;
