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
        /** Display title — required for library UX when category is "Resource" */
        title: {
            type: String,
            default: "",
            trim: true,
            maxlength: 200,
        },
        /** Academic bucket for resource posts (university materials) */
        resourceCategory: {
            type: String,
            enum: ["Lecture Notes", "Assignments", "Tutorials", "Past Papers", "General"],
            default: "General",
        },
        fileName: { type: String, default: "", trim: true },
        mimeType: { type: String, default: "", trim: true },
        fileSizeBytes: { type: Number, default: 0, min: 0 },
        downloadCount: { type: Number, default: 0, min: 0 },
        /** Cloudinary public_id for raw file — used to delete asset when post is removed */
        cloudinaryPublicId: { type: String, default: "", trim: true, maxlength: 512 },
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
