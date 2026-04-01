import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ["Announcement", "Post", "Event Update", "Member Spotlight", "General", "Event", "Resource"],
            default: "Post",
        },
        media: {
            type: String,
            default: "",
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            default: null,
        },
        isSystemPost: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for comments
postSchema.virtual("comments", {
    ref: "Comment",
    localField: "_id",
    foreignField: "post",
});

const Post = mongoose.model("Post", postSchema);

export default Post;
