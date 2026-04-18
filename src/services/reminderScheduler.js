import cron from "node-cron";
import Event from "../models/event.js";
import ReminderPolicy from "../models/ReminderPolicy.js";
import ReminderDispatchLog from "../models/ReminderDispatchLog.js";
import EventRegistration from "../models/EventRegistration.js";
import { sendEventReminderEmail } from "../utils/email.js";

const WINDOW_MS = 5 * 60 * 1000;

const getMinutesFromRule = (rule) => {
    const multipliers = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
    return Number(rule.value || 0) * (multipliers[rule.unit] || 0);
};

const toHumanOffset = (rule) => {
    const value = Number(rule.value || 0);
    if (value === 1) {
        return `in 1 ${rule.unit.slice(0, -1)}`;
    }
    return `in ${value} ${rule.unit}`;
};

const resolvePolicy = (globalPolicy, eventPolicy) => eventPolicy || globalPolicy;

export const processReminderQueue = async () => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - WINDOW_MS);

    const [globalPolicy, eventPolicies] = await Promise.all([
        ReminderPolicy.findOne({ scopeType: "global", event: null }),
        ReminderPolicy.find({ scopeType: "event", event: { $ne: null } }),
    ]);

    if (!globalPolicy && eventPolicies.length === 0) {
        return { processedEvents: 0, sent: 0, failed: 0, skipped: 0 };
    }

    const policyMap = new Map(eventPolicies.map((policy) => [String(policy.event), policy]));

    const events = await Event.find({
        status: "Published",
        dateTime: { $gte: fromDate },
    }).select("_id title dateTime venue");

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const event of events) {
        const policy = resolvePolicy(globalPolicy, policyMap.get(String(event._id)));
        if (!policy || !policy.enabled) continue;

        const activeRules = (policy.rules || []).filter((rule) => rule.enabled);
        if (activeRules.length === 0) continue;

        const registrations = await EventRegistration.find({
            event: event._id,
            status: "Confirmed",
        }).populate("user", "name email");

        for (const rule of activeRules) {
            const minutes = getMinutesFromRule(rule);
            if (!minutes) continue;

            const triggerTime = new Date(new Date(event.dateTime).getTime() - minutes * 60 * 1000);
            const isDue = triggerTime <= now && triggerTime > fromDate;
            if (!isDue) continue;

            const ruleKey = rule.key || `${rule.value}_${rule.unit}`;
            for (const registration of registrations) {
                const user = registration.user;
                if (!user?.email) {
                    skipped += 1;
                    continue;
                }

                if (policy.channels?.email) {
                    const existing = await ReminderDispatchLog.findOne({
                        event: event._id,
                        user: user._id,
                        channel: "email",
                        ruleKey,
                    });

                    if (existing) {
                        skipped += 1;
                        continue;
                    }

                    try {
                        await sendEventReminderEmail(user, event, {
                            message: policy.message,
                            time_until: toHumanOffset(rule),
                        });
                        await ReminderDispatchLog.create({
                            event: event._id,
                            user: user._id,
                            channel: "email",
                            ruleKey,
                            status: "sent",
                        });
                        sent += 1;
                    } catch (error) {
                        await ReminderDispatchLog.create({
                            event: event._id,
                            user: user._id,
                            channel: "email",
                            ruleKey,
                            status: "failed",
                            error: error.message || "Unknown email dispatch error",
                        });
                        failed += 1;
                    }
                }
            }
        }
    }

    return {
        processedEvents: events.length,
        sent,
        failed,
        skipped,
    };
};

export const startReminderScheduler = () => {
    if (process.env.REMINDER_CRON_ENABLED === "false") {
        console.log("Reminder scheduler disabled by REMINDER_CRON_ENABLED=false");
        return null;
    }

    const task = cron.schedule("*/5 * * * *", async () => {
        try {
            const result = await processReminderQueue();
            if (result.sent || result.failed) {
                console.log("Reminder scheduler run:", result);
            }
        } catch (error) {
            console.error("Reminder scheduler failed:", error);
        }
    });

    console.log("Reminder scheduler started (every 5 minutes)");
    return task;
};
