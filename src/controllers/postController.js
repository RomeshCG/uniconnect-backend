import Post from "../models/Post.js";
import Club from "../models/club.js";
import Comment from "../models/Comment.js";
import SavedItem from "../models/SavedItem.js";
import { emitNewPost } from "../config/socket.js";
import { removeCloudinaryRawAsset } from "../utils/cloudinary.js";

function extensionFromMime(mime, fileName) {
    if (fileName && /\.[a-z0-9]{2,8}$/i.test(fileName)) {
        return fileName.split(".").pop().toLowerCase();
    }
    if (!mime) return "pdf";
    const m = mime.toLowerCase();
    if (m.includes("pdf")) return "pdf";
    if (m.includes("wordprocessingml")) return "docx";
    if (m.includes("msword")) return "doc";
    if (m.includes("presentationml")) return "pptx";
    if (m.includes("powerpoint")) return "ppt";
    return "bin";
}

function buildAttachmentFileName(post) {
    const raw = (post.fileName || "").trim();
    if (raw && !raw.includes("..") && !/[\\/]/.test(raw)) {
        return raw.slice(0, 200);
    }
    const ext = extensionFromMime(post.mimeType, post.fileName);
    const base =
        (post.title || "document")
            .replace(/[/\\?%*:|"<>]/g, "_")
            .trim()
            .slice(0, 120) || "document";
    const lower = base.toLowerCase();
    if (lower.endsWith(`.${ext}`)) return base.slice(0, 200);
    return `${base}.${ext}`.slice(0, 200);
}

function contentDispositionAttachment(fileName) {
    const ascii =
        fileName
            .replace(/[^\x20-\x7E]/g, "_")
            .replace(/\\/g, "_")
            .replace(/"/g, "'") || "download.bin";
    const star = encodeURIComponent(fileName);
    return `attachment; filename="${ascii}"; filename*=UTF-8''${star}`;
}

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private/ClubAdmin | Admin | SuperAdmin
export const createPost = async (req, res, next) => {
    try {
        const {
            content,
            media,
            category,
            title,
            resourceCategory,
            fileName,
            mimeType,
            fileSizeBytes,
            cloudinaryPublicId,
        } = req.body;

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

        const cat = category || "General";
        const post = await Post.create({
            author: req.user._id,
            content,
            media: media || "",
            category: cat,
            club: clubId,
            isSystemPost: isSystemPost,
            title: (title && String(title).trim()) || "",
            resourceCategory: cat === "Resource" ? resourceCategory || "General" : "General",
            fileName: (fileName && String(fileName).trim()) || "",
            mimeType: (mimeType && String(mimeType).trim()) || "",
            fileSizeBytes: Number.isFinite(Number(fileSizeBytes)) ? Math.max(0, Number(fileSizeBytes)) : 0,
            downloadCount: 0,
            cloudinaryPublicId: (cloudinaryPublicId && String(cloudinaryPublicId).trim()) || "",
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
        const { category, resourceCategory, search } = req.query;
        const query = {};

        if (category) {
            query.category = category;
        }
        if (resourceCategory) {
            query.resourceCategory = resourceCategory;
        }
        if (search && String(search).trim()) {
            const term = String(search).trim();
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = new RegExp(escaped, "i");
            query.$or = [{ title: rx }, { content: rx }];
        }

        const hasFilters = !!(category || resourceCategory || (search && String(search).trim()));
        const hasPagingParams = req.query.limit != null || req.query.page != null;
        const shouldPaginate = hasFilters || hasPagingParams;

        let cursor = Post.find(query)
            .populate("author", "name profileImage")
            .populate("club", "name logo")
            .populate({
                path: "comments",
                options: { sort: { createdAt: -1 }, limit: 5 },
                populate: { path: "author", select: "name profileImage" }
            })
            .sort({ createdAt: -1 });

        if (shouldPaginate) {
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            cursor = cursor.skip((page - 1) * limit).limit(limit);
        }

        const posts = await cursor;

        res.status(200).json(posts);
    } catch (error) {
        next(error);
    }
};

// @desc    Record a download and return file URL (resource posts)
// @route   POST /api/posts/:id/download
// @access  Private (any logged-in user)
export const recordResourceDownload = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.category !== "Resource") {
            return res.status(400).json({ message: "This item is not a downloadable resource" });
        }
        if (!post.media || !String(post.media).trim()) {
            return res.status(400).json({ message: "No file is attached to this resource" });
        }
        post.downloadCount = (post.downloadCount || 0) + 1;
        await post.save();
        res.status(200).json({
            url: post.media,
            downloadCount: post.downloadCount,
            fileName: post.fileName || "",
            mimeType: post.mimeType || "",
            title: post.title || "",
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Download resource file with a proper filename (proxied from storage)
// @route   GET /api/posts/:id/file
// @access  Private
export const streamResourceFile = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.category !== "Resource") {
            return res.status(400).json({ message: "This item is not a downloadable resource" });
        }
        if (!post.media || !String(post.media).trim()) {
            return res.status(400).json({ message: "No file is attached to this resource" });
        }

        post.downloadCount = (post.downloadCount || 0) + 1;
        await post.save();

        const upstream = await fetch(post.media);
        if (!upstream.ok) {
            return res.status(502).json({ message: "Could not fetch file from storage" });
        }

        const buf = Buffer.from(await upstream.arrayBuffer());
        const downloadName = buildAttachmentFileName(post);

        res.setHeader("Content-Type", post.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", contentDispositionAttachment(downloadName));
        res.setHeader("Content-Length", buf.length);
        res.setHeader("X-Resource-Download-Count", String(post.downloadCount));
        return res.send(buf);
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

        const allowedUpdates = [
            "content",
            "media",
            "category",
            "title",
            "resourceCategory",
            "fileName",
            "mimeType",
            "fileSizeBytes",
            "cloudinaryPublicId",
        ];
        const updates = {};
        allowedUpdates.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        const mergedCategory = updates.category !== undefined ? updates.category : post.category;
        const mergedMedia = updates.media !== undefined ? updates.media : post.media;
        const mergedTitle = updates.title !== undefined ? updates.title : post.title;
        if (mergedCategory === "Resource") {
            const mediaOk = mergedMedia && String(mergedMedia).trim();
            const titleOk = mergedTitle && String(mergedTitle).trim();
            if (!mediaOk || !titleOk) {
                return res.status(400).json({ message: "Resource posts require both title and media (file URL)" });
            }
        }

        const becomingNonResource =
            updates.category !== undefined &&
            updates.category !== "Resource" &&
            post.category === "Resource";
        const mediaReplaced =
            updates.media !== undefined &&
            String(post.media || "").trim() &&
            String(updates.media).trim() !== String(post.media || "").trim();

        if (post.category === "Resource" && (becomingNonResource || mediaReplaced)) {
            await removeCloudinaryRawAsset(post.media, post.cloudinaryPublicId);
        }

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

        if (post.category === "Resource") {
            await removeCloudinaryRawAsset(post.media, post.cloudinaryPublicId);
        }

        await Comment.deleteMany({ post: post._id });
        await SavedItem.deleteMany({ itemId: post._id });
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
