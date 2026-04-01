import express from "express";
import { toggleSave, getMySavedItems, checkIsSaved } from "../controllers/savedItemController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Middleware to ensure user is logged in
router.use(protect);

router.post("/toggle", toggleSave);
router.get("/", getMySavedItems);
router.get("/check/:itemId", checkIsSaved);

export default router;
