import { Router } from "express";
import authRoutes from "./authRoutes.js";
import configRoutes from "./configRoutes.js";
import clubRoutes from "./clubRoutes.js";
import eventRoutes from "./eventRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import postRoutes from "./postRoutes.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "UniConnect API" });
});

router.use("/auth", authRoutes);
router.use("/config", configRoutes);
router.use("/clubs", clubRoutes);
router.use("/events", eventRoutes);
router.use("/upload", uploadRoutes);
router.use("/posts", postRoutes);

export default router;

