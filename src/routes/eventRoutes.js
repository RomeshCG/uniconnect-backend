import { Router } from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import {
    createEvent,
    getEvents,
    getMyClubEvents,
    updateEvent,
    deleteEvent,
    getEvent
} from "../controllers/eventController.js";
import { validateRequest, eventSchema } from "../utils/validators.js";

const router = Router();

// Club admin routes
router.get("/mine", protect, restrictTo("club_admin", "admin", "superAdmin"), getMyClubEvents);

// Publicly accessible to logged in users (mostly students browsing)
router.get("/", protect, getEvents);
router.get("/:id", protect, getEvent);

router.post(
    "/",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    validateRequest(eventSchema),
    createEvent
);

router.put(
    "/:id",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    validateRequest(eventSchema.partial()),
    updateEvent
);

router.delete(
    "/:id",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    deleteEvent
);

export default router;
