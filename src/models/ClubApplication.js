import mongoose from "mongoose";

const clubApplicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        studentId: {
            type: String,
            required: true,
        },
        department: {
            type: String,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        reviewedAt: {
            type: Date,
        },
        reviewNotes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate pending applications from the same user to the same club
clubApplicationSchema.index({ user: 1, club: 1, status: 1 }, { unique: false });

const ClubApplication = mongoose.model("ClubApplication", clubApplicationSchema);

export default ClubApplication;
