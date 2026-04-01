import { Router } from "express";
import { getClubAnalytics, getEngagementAnalytics } from "../controllers/analyticsController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

// All analytics routes are protected and restricted to admin roles
router.use(protect);
router.use(restrictTo("admin", "superAdmin"));

router.get("/clubs", getClubAnalytics);
router.get("/engagement", getEngagementAnalytics);

export default router;
