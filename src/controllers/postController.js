import Post from "../models/post.js";
import Club from "../models/club.js";

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private/ClubAdmin | Admin | SuperAdmin
export const createPost = async (req, res, next) => {
    try {
        const { title, content, image, category, status } = req.body;

        let authorName = "UniConnect";
        let club = null;

        if (req.user.role === "club_admin") {
            const clubDoc = await Club.findOne({ admin: req.user._id });
            if (!clubDoc) {
                return res.status(403).json({
                    message: "You must be the admin of a registered club to create posts.",
                });
            }
            authorName = clubDoc.name;
            club = clubDoc._id;
        }

        // Enforce category defaults and restrictions
        let resolvedCategory = category;
        if (req.user.role === "club_admin") {
            // Club admins can use Post, Event Update, Member Spotlight — not Announcement
            const allowedForClubAdmin = ["Post", "Event Update", "Member Spotlight"];
            if (!allowedForClubAdmin.includes(resolvedCategory)) {
                resolvedCategory = "Post";
            }
        } else {
            // Admin / superAdmin — default to Announcement if not specified
            if (!resolvedCategory || resolvedCategory === "Post") {
                resolvedCategory = "Announcement";
            }
        }

        const post = await Post.create({
            title: title || "",
            content,
            image: image || "",
            category: resolvedCategory,
            status: status || "Draft",
            authorName,
            club,
            createdBy: req.user._id,
        });

        res.status(201).json({ message: "Post created successfully", post });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all posts (for management — admins see all, club_admin sees own club)
// @route   GET /api/posts
// @access  Private/ClubAdmin | Admin | SuperAdmin
export const getPosts = async (req, res, next) => {
    try {
        let query = {};

        if (req.user.role === "club_admin") {
            const club = await Club.findOne({ admin: req.user._id });
            if (!club) return res.status(200).json([]);
            query.club = club._id;
        }

        const posts = await Post.find(query)
            .populate("club", "name")
            .populate("createdBy", "name")
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
        const posts = await Post.find({ status: "Published" })
            .populate("club", "name")
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

        const isCreator = post.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to update this post" });
        }

        const allowedUpdates = ["title", "content", "image", "category", "status"];
        const updates = {};
        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const updatedPost = await Post.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

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

        const isCreator = post.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

        if (!isCreator && !isAdmin) {
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
            .populate("club", "name description")
            .populate("createdBy", "name profileImage");

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json(post);
    } catch (error) {
        next(error);
    }
};
