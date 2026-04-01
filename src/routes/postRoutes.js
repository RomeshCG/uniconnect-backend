import { Router } from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import {
    createPost,
    getPosts,
    getPublishedPosts,
    updatePost,
    deletePost,
    getPost,
    toggleLike,
    addComment,
    getComments,
} from "../controllers/postController.js";
import { validateRequest, postSchema } from "../utils/validators.js";

const router = Router();

// Feed & Interactions (all logged in users)
router.get("/published", protect, getPublishedPosts);
router.get("/:id", protect, getPost);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/comment", protect, addComment);
router.get("/:id/comments", protect, getComments);

// Management routes — restricted to admins/club_admins
router.get(
    "/",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    getPosts
);

router.post(
    "/",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    validateRequest(postSchema),
    createPost
);

router.put(
    "/:id",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    validateRequest(postSchema.partial()),
    updatePost
);

router.delete(
    "/:id",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    deletePost
);

export default router;
