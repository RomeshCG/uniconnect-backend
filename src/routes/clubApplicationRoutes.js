import express from "express";
import { 
    applyToClub, 
    getClubApplications, 
    updateApplicationStatus 
} from "../controllers/clubApplicationController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Student applies to a club
router.post("/apply", applyToClub);

// Club Admin routes
router.get("/club/:clubId", restrictTo("club_admin", "admin", "superAdmin"), getClubApplications);
router.patch("/:applicationId/status", restrictTo("club_admin", "admin", "superAdmin"), updateApplicationStatus);

export default router;
