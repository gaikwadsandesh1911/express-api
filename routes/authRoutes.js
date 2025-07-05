import express from 'express';
import { deleteMe, forgotPassword, getAllUsers, login, protect, resetPassword, signup, updateMe, updatePassword, restrict } from '../controllers/authController.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
const router = express.Router();

router.post("/signup", signup);
router.post("/login", loginLimiter, login);
router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:token", resetPassword);
router.patch("/updatePassword", protect ,updatePassword);
router.patch("/updateMe", protect, updateMe);
router.delete("/deleteMe", protect, deleteMe);
router.get('/all-users', protect, restrict('admin', 'superAdmin'), getAllUsers);

export default router;