import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: "",
        },
        content: {
            type: String,
            required: [true, "Post content (caption) is required"],
            trim: true,
            maxlength: [2200, "Content cannot exceed 2200 characters"],
        },
        image: {
            type: String, // URL
            default: "",
        },
        category: {
            type: String,
            required: [true, "Post category is required"],
            enum: ["Post", "Announcement", "Event Update", "Member Spotlight"],
            default: "Post",
        },
        status: {
            type: String,
            enum: ["Draft", "Published"],
            default: "Draft",
        },
        // The display name for the author (club name or "UniConnect" for admins)
        authorName: {
            type: String,
            required: [true, "Author name is required"],
            trim: true,
        },
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Post must have a creator"],
        },
        likes: {
            type: Number,
            default: 0,
        },
        comments: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
