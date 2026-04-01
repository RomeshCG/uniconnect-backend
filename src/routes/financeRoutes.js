import { Router } from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import {
    getEventFinanceSummary,
    getSponsors,
    addSponsor,
    updateSponsor,
    deleteSponsor,
    getExpenses,
    addExpense,
    updateEventFinanceConfig
} from "../controllers/financeController.js";

const router = Router();

// All finance routes require being logged in and having at least club_admin role
// Further checks are done in the controller to ensure they own the specific event
router.use(protect, restrictTo("club_admin", "event_host", "admin", "superAdmin"));

router.get("/:eventId/summary", getEventFinanceSummary);
router.get("/:eventId/sponsors", getSponsors);
router.post("/:eventId/sponsors", addSponsor);
router.put("/:eventId/sponsors/:sponsorId", updateSponsor);
router.delete("/:eventId/sponsors/:sponsorId", deleteSponsor);
router.get("/:eventId/expenses", getExpenses);
router.post("/:eventId/expenses", addExpense);
router.put("/:eventId/config", updateEventFinanceConfig);

export default router;
