import { Router } from "express";
import { 
  getBanners, 
  createBanner, 
  updateBanner, 
  deleteBanner, 
  getSystemConfig, 
  updateSystemConfig 
} from "../controllers/systemController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

// Publicly readable system config (to check for blackout/maintenance)
router.get("/config", getSystemConfig);

// Banner endpoints
router.get("/banners", getBanners);
router.post("/banners", protect, restrictTo("admin", "superAdmin"), createBanner);
router.put("/banners/:id", protect, restrictTo("admin", "superAdmin"), updateBanner);
router.delete("/banners/:id", protect, restrictTo("admin", "superAdmin"), deleteBanner);

// SuperAdmin only config updates
router.patch("/config", protect, restrictTo("superAdmin"), updateSystemConfig);

export default router;
