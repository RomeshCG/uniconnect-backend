import mongoose from "mongoose";

const clubMemberSchema = new mongoose.Schema(
    {
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["club_member", "event_host"],
            default: "club_member",
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a user can only be a member of a club once
clubMemberSchema.index({ club: 1, user: 1 }, { unique: true });

const ClubMember = mongoose.model("ClubMember", clubMemberSchema);

export default ClubMember;
