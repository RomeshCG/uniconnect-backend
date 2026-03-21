import { Router } from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { createClub, getClubs, getMyClubs, addMember } from "../controllers/clubController.js";

const router = Router();

// Retrieve all clubs
router.get("/", protect, getClubs);

// Club Admin only route for their own managed clubs
router.get("/mine", protect, restrictTo("club_admin", "admin", "superAdmin"), getMyClubs);

// SuperAdmin and Admin can create clubs
router.post("/", protect, restrictTo("admin", "superAdmin"), createClub);

// Club_Admin can add members to specific club
router.post("/:clubId/members", protect, restrictTo("club_admin", "admin", "superAdmin"), addMember);

export default router;
