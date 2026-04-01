import Post from "../models/post.js";
import Club from "../models/club.js";
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
            .populate("club", "name logo");

        emitNewPost(populatedPost);

        res.status(201).json({ message: "Post created successfully", post: populatedPost });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all posts (for management)
// @route   GET /api/posts
// @access  Private
// FIX: Segregate posts based on role
export const getPosts = async (req, res, next) => {
    try {
        let query = {};

        // RBAC: Segregation Logic
        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            if (club) {
                query = { club: club._id };
            } else {
                return res.status(200).json([]); // No club, no posts
            }
        } else if (req.user.role === "superAdmin" || req.user.role === "admin") {
            // User specifically asked superAdmin to see posts "posted by using that role"
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
        // Feed always shows all published posts
        const posts = await Post.find()
            .populate("author", "name")
            .populate("club", "name logo")
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private/Owner | Admin
export const updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Authorization Logic
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";
        let isAuthorized = isAdmin;

        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            isAuthorized = club && post.club && post.club.toString() === club._id.toString();
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: "Not authorized to update this post" });
        }

        const allowedUpdates = ["content", "media", "category"];
        const updates = {};
        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const updatedPost = await Post.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        })
        .populate("author", "name")
        .populate("club", "name logo");

        res.status(200).json({ message: "Post updated successfully", post: updatedPost });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private/Owner | Admin
export const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Authorization Logic
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";
        let isAuthorized = isAdmin;

        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            isAuthorized = club && post.club && post.club.toString() === club._id.toString();
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: "Not authorized to delete this post" });
        }

        await post.deleteOne();
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
export const getPost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("author", "name profileImage")
            .populate("club", "name logo");

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json(post);
    } catch (error) {
        next(error);
    }
};
