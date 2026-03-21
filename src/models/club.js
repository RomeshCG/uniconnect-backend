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
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Club admin is required"],
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Club = mongoose.model("Club", clubSchema);

export default Club;
