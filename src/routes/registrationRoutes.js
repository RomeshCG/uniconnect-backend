import express from "express";
import {
    registerForEvent,
    getMyRegistrations,
    getRegistrationDetails
} from "../controllers/eventRegistrationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // All registration routes are protected
router.post("/event/:id", registerForEvent);
router.get("/my-tickets", getMyRegistrations);
router.get("/:id", getRegistrationDetails);

export default router;
