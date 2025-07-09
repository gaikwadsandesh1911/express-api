import { getAllMovies, getMovieStats, getMovieByGenre, createMovie, getMovieById, updateMovieById, deleteMovieById} from "../controllers/movieController.js";
import { protect, restrict } from "../controllers/authController.js";

import express from "express";
import { upload } from "../middleware/multer.js";
const router = express.Router();

router.get("/movies/all", protect, getAllMovies);
router.get("/movies/stats", protect, restrict('admin'), getMovieStats);
router.get("/genre/:genre", protect, restrict('admin'), getMovieByGenre);
router.post("/create", protect, restrict('admin'), upload.array('coverImage', 5) ,createMovie);
router.get("/:id", protect, getMovieById);
router.patch("/:id", protect,  updateMovieById);
router.delete("/:id", protect, restrict('admin', 'superAdmin'), deleteMovieById);

export default router;
