import { Router } from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import {
    createClub,
    getClubs,
    getMyClubs,
    getClubMembers,
    addMember,
    updateMemberRole,
    removeMember,
    updateClubSettings,
    deleteClub,
    toggleClubBan
} from "../controllers/clubController.js";

const router = Router();

// Retrieve all clubs
router.get("/", protect, getClubs);

// Club Admin only route for their own managed clubs
router.get("/mine", protect, restrictTo("club_admin", "admin", "superAdmin"), getMyClubs);

router.get("/:clubId", protect, getClubs); // Use the same controller or create a new one

// Get members of a club
router.get("/:clubId/members", protect, getClubMembers);

// SuperAdmin and Admin can create clubs
router.post("/", protect, restrictTo("admin", "superAdmin"), createClub);

// Club settings update
router.put("/:clubId/settings", protect, restrictTo("club_admin", "admin", "superAdmin"), updateClubSettings);

// Admin and SuperAdmin actions
router.delete("/:clubId", protect, restrictTo("admin", "superAdmin"), deleteClub);
router.patch("/:clubId/ban", protect, restrictTo("admin", "superAdmin"), toggleClubBan);

// Member management
router.post("/:clubId/members", protect, restrictTo("club_admin", "admin", "superAdmin"), addMember);
router.patch("/:clubId/members/:userId/role", protect, restrictTo("club_admin", "admin", "superAdmin"), updateMemberRole);
router.delete("/:clubId/members/:userId", protect, restrictTo("club_admin", "admin", "superAdmin"), removeMember);

export default router;
