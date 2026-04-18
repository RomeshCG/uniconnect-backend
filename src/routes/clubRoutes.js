import { Router } from "express";
import { protect, restrictTo, optionalProtect } from "../middlewares/authMiddleware.js";
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
    toggleClubBan,
    toggleMemberBan,
    getClubNews,
    updateMemberBoard,
} from "../controllers/clubController.js";

const router = Router();

// Retrieve all clubs
router.get("/", optionalProtect, getClubs);

// Club Admin only route for their own managed clubs
router.get("/mine", protect, restrictTo("club_admin", "event_host", "admin", "superAdmin"), getMyClubs);

// Must be registered before `/:clubId` so `news` is not captured as clubId
router.get("/:clubId/news", optionalProtect, getClubNews);

router.get("/:clubId", optionalProtect, getClubs); // Public access with optional auth

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
router.patch("/:clubId/members/:userId/board", protect, restrictTo("club_admin", "admin", "superAdmin"), updateMemberBoard);
router.patch("/:clubId/members/:userId/ban", protect, restrictTo("club_admin", "admin", "superAdmin"), toggleMemberBan);
router.delete("/:clubId/members/:userId", protect, restrictTo("club_admin", "admin", "superAdmin"), removeMember);

export default router;
