import mongoose from "mongoose";

const sponsorshipSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: [true, "Sponsorship must belong to an event"],
        },
        name: {
            type: String,
            required: [true, "Sponsor name is required"],
            trim: true,
        },
        tier: {
            type: String,
            required: [true, "Sponsorship tier is required"],
            enum: ["PLATINUM", "GOLD", "SILVER", "IN-KIND"],
            default: "SILVER",
        },
        amount: {
            type: Number,
            required: [true, "Sponsorship amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        status: {
            type: String,
            enum: ["Pending", "Active", "Completed", "Inactive"],
            default: "Active",
        },
        contactEmail: {
            type: String,
            required: [true, "Contact email is required"],
            trim: true,
            lowercase: true,
        },
        contactPhone: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const Sponsorship = mongoose.model("Sponsorship", sponsorshipSchema);

export default Sponsorship;
