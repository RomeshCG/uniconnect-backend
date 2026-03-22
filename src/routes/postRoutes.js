import { Router } from "express";
import { 
    getPosts, 
    createPost, 
    toggleLike, 
    addComment 
} from "../controllers/postController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = Router();

// Protected routes (require login)
router.use(protect);

router
    .route("/")
    .get(getPosts)
    .post(restrictTo("admin", "superAdmin"), upload.single("media"), createPost);

router.post("/:postId/like", toggleLike);
router.post("/:postId/comment", addComment);

export default router;
