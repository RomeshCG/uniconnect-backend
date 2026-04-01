import { Router } from "express";
import authRoutes from "./authRoutes.js";
import configRoutes from "./configRoutes.js";
import clubRoutes from "./clubRoutes.js";
import eventRoutes from "./eventRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import postRoutes from "./postRoutes.js";
import registrationRoutes from "./registrationRoutes.js";
import savedItemRoutes from "./savedItemRoutes.js";
import financeRoutes from "./financeRoutes.js";

import analyticsRoutes from "./analyticsRoutes.js";
import systemRoutes from "./systemRoutes.js";

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
router.use("/registrations", registrationRoutes);
router.use("/saved-items", savedItemRoutes);
router.use("/finance", financeRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/system", systemRoutes);

export default router;

