import { Router } from "express";
import authRoutes from "./authRoutes.js";
import configRoutes from "./configRoutes.js";
import clubRoutes from "./clubRoutes.js";
import eventRoutes from "./eventRoutes.js";
import uploadRoutes from "./uploadRoutes.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "UniConnect API" });
});

router.use("/auth", authRoutes);
router.use("/config", configRoutes);
router.use("/clubs", clubRoutes);
router.use("/events", eventRoutes);
router.use("/upload", uploadRoutes);

export default router;
