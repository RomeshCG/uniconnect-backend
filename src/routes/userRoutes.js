import { Router } from "express";
import { getAllUsers, toggleUserBan, deleteUser } from "../controllers/userController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

// Only superAdmin can manage users
router.use(protect);
router.use(restrictTo("superAdmin"));

router.get("/", getAllUsers);
router.patch("/:id/ban", toggleUserBan);
router.delete("/:id", deleteUser);

export default router;
