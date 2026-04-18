import { Router } from "express";
import {
    getTemplates,
    getTemplateByKey,
    upsertTemplate,
    sendTemplateTestEmail,
    getReminderPolicy,
    upsertReminderPolicy,
    runReminderDispatchNow,
} from "../controllers/communicationsController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect, restrictTo("admin", "superAdmin"));

router.get("/templates", getTemplates);
router.get("/templates/:key", getTemplateByKey);
router.put("/templates/:key", upsertTemplate);
router.post("/templates/:key/test-send", sendTemplateTestEmail);
router.get("/reminders/policy", getReminderPolicy);
router.put("/reminders/policy", upsertReminderPolicy);
router.post("/reminders/run-now", runReminderDispatchNow);

export default router;
