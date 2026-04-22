import nodemailer from "nodemailer";
import EmailTemplate from "../models/EmailTemplate.js";
import ReminderPolicy from "../models/ReminderPolicy.js";
import User from "../models/user.js";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATE_KEYS } from "../constants/emailTemplates.js";
import { getResolvedEmailTemplateByKey, renderEmailTemplate } from "../utils/emailTemplateService.js";
import { processReminderQueue } from "../services/reminderScheduler.js";

const ALLOWED_KEYS = Object.values(EMAIL_TEMPLATE_KEYS);

export const submitHelpRequest = async (req, res, next) => {
    try {
        const subject = typeof req.body.subject === "string" ? req.body.subject.trim() : "";
        const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

        if (!subject || !message) {
            return res.status(400).json({ message: "Subject and message are required" });
        }

        const superAdmins = await User.find({ role: "superAdmin", isBanned: { $ne: true } })
            .select("email name")
            .lean();

        if (superAdmins.length === 0) {
            return res.status(404).json({ message: "No active system admin found to receive this request" });
        }

        const recipients = superAdmins.map((user) => user.email).filter(Boolean);
        if (recipients.length === 0) {
            return res.status(404).json({ message: "System admin contact email is not configured" });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        const requesterName = req.user?.name || "Unknown user";
        const requesterEmail = req.user?.email || "unknown@email";
        const requesterRole = req.user?.role || "unknown";

        const html = `
            <h2>New Help Request</h2>
            <p><strong>From:</strong> ${requesterName} (${requesterEmail})</p>
            <p><strong>Role:</strong> ${requesterRole}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr />
            <p style="white-space: pre-wrap;">${message}</p>
        `;

        await transporter.sendMail({
            from: `"UniConnect Help Desk" <${process.env.GMAIL_USER}>`,
            to: recipients.join(","),
            replyTo: requesterEmail,
            subject: `[Help Request] ${subject}`,
            html,
        });

        res.status(200).json({ message: "Your help request was sent to the system admin team." });
    } catch (error) {
        next(error);
    }
};

const normalizeTemplatePayload = (template, customTemplate) => ({
    key: template.key,
    name: customTemplate?.name || template.name,
    subject: customTemplate?.subject || template.subject,
    html: customTemplate?.html || template.html,
    enabled: customTemplate?.enabled ?? true,
    source: customTemplate ? "custom" : "default",
    updatedAt: customTemplate?.updatedAt || null,
    version: customTemplate?.version || 1,
});

export const getTemplates = async (req, res, next) => {
    try {
        const customTemplates = await EmailTemplate.find({ key: { $in: ALLOWED_KEYS } }).lean();
        const customMap = new Map(customTemplates.map((item) => [item.key, item]));
        const templates = ALLOWED_KEYS.map((key) =>
            normalizeTemplatePayload(DEFAULT_EMAIL_TEMPLATES[key], customMap.get(key))
        );
        res.status(200).json(templates);
    } catch (error) {
        next(error);
    }
};

export const getTemplateByKey = async (req, res, next) => {
    try {
        const { key } = req.params;
        if (!ALLOWED_KEYS.includes(key)) {
            return res.status(404).json({ message: "Template key not found" });
        }

        const customTemplate = await EmailTemplate.findOne({ key }).lean();
        const payload = normalizeTemplatePayload(DEFAULT_EMAIL_TEMPLATES[key], customTemplate);
        res.status(200).json(payload);
    } catch (error) {
        next(error);
    }
};

export const upsertTemplate = async (req, res, next) => {
    try {
        const { key } = req.params;
        if (!ALLOWED_KEYS.includes(key)) {
            return res.status(404).json({ message: "Template key not found" });
        }

        const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[key];
        const payload = {
            name: req.body.name || defaultTemplate.name,
            subject: req.body.subject || defaultTemplate.subject,
            html: req.body.html || defaultTemplate.html,
            enabled: req.body.enabled ?? true,
            updatedBy: req.user._id,
        };

        let template = await EmailTemplate.findOne({ key });
        if (!template) {
            template = await EmailTemplate.create({
                key,
                ...payload,
                version: 1,
            });
        } else {
            template.name = payload.name;
            template.subject = payload.subject;
            template.html = payload.html;
            template.enabled = payload.enabled;
            template.updatedBy = payload.updatedBy;
            template.version = (template.version || 1) + 1;
            await template.save();
        }

        res.status(200).json({
            message: "Email template saved successfully",
            template: normalizeTemplatePayload(defaultTemplate, template.toObject()),
        });
    } catch (error) {
        next(error);
    }
};

export const sendTemplateTestEmail = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { to, variables = {} } = req.body;

        if (!ALLOWED_KEYS.includes(key)) {
            return res.status(404).json({ message: "Template key not found" });
        }

        if (!to) {
            return res.status(400).json({ message: "Recipient email is required" });
        }

        const template = await getResolvedEmailTemplateByKey(key);
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        const defaultVariables = {
            year: new Date().getFullYear(),
            user_name: "Test User",
            event_title: "Sample Event",
            event_date: new Date().toLocaleDateString(),
            event_time: new Date().toLocaleTimeString(),
            event_venue: "Main Auditorium",
            ticket_id: "UCN-TEST-0001",
            ticket_link: `${process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",")[0] : "http://localhost:5173"}/my-tickets`,
            club_name: "Sample Club",
            club_link: `${process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",")[0] : "http://localhost:5173"}/clubs/sample`,
            otp: "123456",
        };

        const mergedVariables = { ...defaultVariables, ...variables };

        await transporter.sendMail({
            from: `"UniConnect" <${process.env.GMAIL_USER}>`,
            to,
            subject: renderEmailTemplate(template.subject, mergedVariables),
            html: renderEmailTemplate(template.html, mergedVariables),
        });

        res.status(200).json({ message: "Test email sent successfully" });
    } catch (error) {
        next(error);
    }
};

const defaultRules = [
    { key: "1_day_before", value: 1, unit: "days", enabled: true },
    { key: "1_hour_before", value: 1, unit: "hours", enabled: true },
];

const normalizeReminderPolicy = (policy) => ({
    scopeType: policy?.scopeType || "global",
    event: policy?.event || null,
    enabled: policy?.enabled ?? true,
    channels: {
        inApp: policy?.channels?.inApp ?? true,
        email: policy?.channels?.email ?? true,
        sms: policy?.channels?.sms ?? false,
    },
    message:
        policy?.message ||
        "Just a quick reminder! {{event_title}} is starting soon. Make sure your QR ticket is ready.",
    rules: Array.isArray(policy?.rules) && policy.rules.length > 0 ? policy.rules : defaultRules,
    updatedAt: policy?.updatedAt || null,
});

export const getReminderPolicy = async (req, res, next) => {
    try {
        const { eventId } = req.query;
        let policy = null;

        if (eventId) {
            policy = await ReminderPolicy.findOne({ scopeType: "event", event: eventId }).lean();
        }

        if (!policy) {
            policy = await ReminderPolicy.findOne({ scopeType: "global", event: null }).lean();
        }

        res.status(200).json(normalizeReminderPolicy(policy));
    } catch (error) {
        next(error);
    }
};

export const upsertReminderPolicy = async (req, res, next) => {
    try {
        const { eventId } = req.query;
        const scopeType = eventId ? "event" : "global";

        const rules = Array.isArray(req.body.rules)
            ? req.body.rules.map((rule, index) => ({
                  key: rule.key || `custom_${index + 1}`,
                  value: Number(rule.value || 0),
                  unit: rule.unit,
                  enabled: rule.enabled ?? true,
              }))
            : defaultRules;

        const payload = {
            scopeType,
            event: eventId || null,
            enabled: req.body.enabled ?? true,
            channels: {
                inApp: req.body.channels?.inApp ?? true,
                email: req.body.channels?.email ?? true,
                sms: req.body.channels?.sms ?? false,
            },
            message: req.body.message,
            rules,
            updatedBy: req.user._id,
        };

        const policy = await ReminderPolicy.findOneAndUpdate(
            { scopeType, event: eventId || null },
            payload,
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            message: "Reminder policy saved successfully",
            policy: normalizeReminderPolicy(policy),
        });
    } catch (error) {
        next(error);
    }
};

export const runReminderDispatchNow = async (req, res, next) => {
    try {
        const result = await processReminderQueue();
        res.status(200).json({
            message: "Reminder processor executed",
            result,
        });
    } catch (error) {
        next(error);
    }
};
