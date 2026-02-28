import { Router } from "express";
import authRoutes from "./authRoutes.js";
import configRoutes from "./configRoutes.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "UniConnect API" });
});

router.use("/auth", authRoutes);
router.use("/config", configRoutes);

export default router;
