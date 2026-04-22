import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Club name is required"],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        mission: {
            type: String,
            trim: true,
            default: "",
        },
        vision: {
            type: String,
            trim: true,
            default: "",
        },
        category: {
            type: String,
            trim: true,
            default: "General",
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Club admin is required"],
            unique: true,
        },
        logo: {
            type: String,
            default: "",
        },
        banner: {
            type: String,
            default: "",
        },
        gallery: [
            {
                type: String,
            },
        ],
        socialLinks: {
            instagram: { type: String, default: "" },
            twitter: { type: String, default: "" },
            facebook: { type: String, default: "" },
            website: { type: String, default: "" },
        },
        contactInfo: {
            email: { type: String, trim: true, default: "" },
            phone: { type: String, trim: true, default: "" },
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Club = mongoose.model("Club", clubSchema);

export default Club;
