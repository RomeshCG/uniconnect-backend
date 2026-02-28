import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            required: true,
            unique: true,
            enum: ["student", "admin", "superAdmin", "lecturer", "staff", "clubAdmin", "clubMember"],
        },
        allowedDomains: {
            type: [String],
            default: [],
            description: "List of allowed email domains for this role, e.g., ['@my.sliit.lk']",
        },
    },
    {
        timestamps: true,
    }
);

const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

export default SystemConfig;
