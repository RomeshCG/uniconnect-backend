import Post from "../models/post.js";
import Club from "../models/club.js";
import Comment from "../models/comment.js";
import { emitNewPost } from "../config/socket.js";

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private/ClubAdmin | Admin | SuperAdmin
export const createPost = async (req, res, next) => {
    try {
        const { content, media, category } = req.body;

        let clubId = null;
        let isSystemPost = false;

        // Determine Branding Identity
        if (req.user.role === "superAdmin" || req.user.role === "admin") {
            isSystemPost = true;
        } else if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            if (club) {
                clubId = club._id;
            } else {
                isSystemPost = true;
            }
        }

        const post = await Post.create({
            author: req.user._id,
            content,
            media: media || "",
            category: category || "General",
            club: clubId,
            isSystemPost: isSystemPost,
        });

        const populatedPost = await Post.findById(post._id)
            .populate("author", "name profileImage")
            .populate("club", "name logo")
            .populate({
                path: "comments",
                options: { sort: { createdAt: -1 }, limit: 5 },
                populate: { path: "author", select: "name profileImage" }
            });

        emitNewPost(populatedPost);

        res.status(201).json({ message: "Post created successfully", post: populatedPost });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all posts (for management)
// @route   GET /api/posts
// @access  Private
export const getPosts = async (req, res, next) => {
    try {
        let query = {};

        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            if (club) {
                query = { club: club._id };
            } else {
                return res.status(200).json([]);
            }
        } else if (req.user.role === "superAdmin" || req.user.role === "admin") {
            query = { isSystemPost: true };
        }

        const posts = await Post.find(query)
            .populate("author", "name")
            .populate("club", "name logo")
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        next(error);
    }
};

// @desc    Get published posts (for public feed)
// @route   GET /api/posts/published
// @access  Private
export const getPublishedPosts = async (req, res, next) => {
    try {
        const posts = await Post.find()
            .populate("author", "name profileImage")
            .populate("club", "name logo")
            .populate({
                path: "comments",
                options: { sort: { createdAt: -1 }, limit: 5 },
                populate: { path: "author", select: "name profileImage" }
            })
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
export const updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Post not found" });

        const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
        let isAuthorized = isAdmin;

        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            isAuthorized = club && post.club && post.club.toString() === club._id.toString();
        }

        if (!isAuthorized) return res.status(403).json({ message: "Unauthorized" });

        const allowedUpdates = ["content", "media", "category"];
        const updates = {};
        allowedUpdates.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        const updatedPost = await Post.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
            .populate("author", "name")
            .populate("club", "name logo");

        res.status(200).json({ message: "Post updated", post: updatedPost });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
export const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) return res.status(404).json({ message: "Post not found" });

        const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
        let isAuthorized = isAdmin;

        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            isAuthorized = club && post.club && post.club.toString() === club._id.toString();
        }

        if (!isAuthorized) return res.status(403).json({ message: "Unauthorized" });

        await post.deleteOne();
        res.status(200).json({ message: "Post deleted" });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single post
// @route   GET /api/posts/:id
export const getPost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("author", "name profileImage")
            .populate("club", "name logo")
            .populate({
                path: "comments",
                populate: { path: "author", select: "name profileImage" }
            });

        if (!post) return res.status(404).json({ message: "Post not found" });
        res.status(200).json(post);
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle like on a post
// @route   POST /api/posts/:id/like
export const toggleLike = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const index = post.likes.indexOf(req.user._id);
        if (index === -1) {
            post.likes.push(req.user._id);
        } else {
            post.likes.splice(index, 1);
        }

        await post.save();
        res.status(200).json({ likes: post.likes });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comment
export const addComment = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "Comment text is required" });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = await Comment.create({
            author: req.user._id,
            post: req.params.id,
            text
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate("author", "name profileImage");

        res.status(201).json(populatedComment);
    } catch (error) {
        next(error);
    }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
export const getComments = async (req, res, next) => {
    try {
        const comments = await Comment.find({ post: req.params.id })
            .populate("author", "name profileImage")
            .sort({ createdAt: -1 });

        res.status(200).json(comments);
    } catch (error) {
        next(error);
    }
};
