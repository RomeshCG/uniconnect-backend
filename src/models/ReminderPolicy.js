import mongoose from "mongoose";

const reminderRuleSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, trim: true },
        value: { type: Number, required: true, min: 1 },
        unit: { type: String, enum: ["minutes", "hours", "days", "weeks"], required: true },
        enabled: { type: Boolean, default: true },
    },
    { _id: false }
);

const reminderPolicySchema = new mongoose.Schema(
    {
        scopeType: {
            type: String,
            enum: ["global", "event"],
            default: "global",
            required: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            default: null,
        },
        channels: {
            inApp: { type: Boolean, default: true },
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
        },
        message: {
            type: String,
            default: "Just a quick reminder! {{event_title}} is starting soon. Make sure your QR ticket is ready.",
            trim: true,
            maxlength: 500,
        },
        rules: {
            type: [reminderRuleSchema],
            default: [
                { key: "1_day_before", value: 1, unit: "days", enabled: true },
                { key: "1_hour_before", value: 1, unit: "hours", enabled: true },
            ],
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

reminderPolicySchema.index({ scopeType: 1, event: 1 }, { unique: true });

const ReminderPolicy = mongoose.model("ReminderPolicy", reminderPolicySchema);

export default ReminderPolicy;
