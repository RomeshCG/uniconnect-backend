import mongoose from "mongoose";

const reminderDispatchLogSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        channel: {
            type: String,
            enum: ["email", "in_app", "sms"],
            required: true,
        },
        ruleKey: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["sent", "failed", "skipped"],
            default: "sent",
        },
        error: {
            type: String,
            default: "",
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

reminderDispatchLogSchema.index({ event: 1, user: 1, channel: 1, ruleKey: 1 }, { unique: true });

const ReminderDispatchLog = mongoose.model("ReminderDispatchLog", reminderDispatchLogSchema);

export default ReminderDispatchLog;
