import Post from "../models/Post.js";
import Comment from "../models/Comment.js";

// Fetch all posts with populated authors and comments
export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate("author", "name department initials profileImage")
            .populate({
                path: "comments",
                populate: { path: "author", select: "name" },
            });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch posts", error: error.message });
    }
};

// Create a new post
export const createPost = async (req, res) => {
    try {
        const { content, category, media } = req.body;
        const post = await Post.create({
            author: req.user._id,
            content,
            category,
            media,
        });
        
        const populatedPost = await post.populate("author", "name department initials profileImage");
        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: "Failed to create post", error: error.message });
    }
};

// Handle post likes
export const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Post.findById(postId);
        
        if (!post) return res.status(404).json({ message: "Post not found" });

        const isLiked = post.likes.includes(req.user._id);

        if (isLiked) {
            post.likes = post.likes.filter(id => id.toString() !== req.user._id.toString());
        } else {
            post.likes.push(req.user._id);
        }

        await post.save();
        res.status(200).json({ likes: post.likes, isLiked: !isLiked });
    } catch (error) {
        res.status(500).json({ message: "Failed to toggle like", error: error.message });
    }
};

// Post a comment
export const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;

        const comment = await Comment.create({
            author: req.user._id,
            post: postId,
            text,
        });

        const populatedComment = await comment.populate("author", "name");
        res.status(201).json(populatedComment);
    } catch (error) {
        res.status(500).json({ message: "Failed to add comment", error: error.message });
    }
};
