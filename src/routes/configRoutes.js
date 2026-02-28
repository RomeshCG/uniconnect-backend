import { Router } from "express";
import { updateConfig, getConfig, getAllConfigs } from "../controllers/configController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

// Public routes for signup guidance
router.get("/", getAllConfigs);
router.get("/:role", getConfig);

// Only superAdmin can manage these rules
router.use(protect);
router.use(restrictTo("superAdmin"));

router.patch("/update", updateConfig);

export default router;
