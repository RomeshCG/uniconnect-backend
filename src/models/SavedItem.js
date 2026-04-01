import mongoose from "mongoose";

const savedItemSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
        },
        itemType: {
            type: String,
            required: [true, "Item type is required"],
            enum: ["Event", "Post"],
        },
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "itemType",
            required: [true, "Item ID is required"],
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a user cannot save the same item twice
savedItemSchema.index({ user: 1, itemId: 1 }, { unique: true });

const SavedItem = mongoose.model("SavedItem", savedItemSchema);

export default SavedItem;
