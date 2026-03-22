import { Router } from "express";
import { 
    getPosts, 
    createPost, 
    toggleLike, 
    addComment 
} from "../controllers/postController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

// Publicly accessible but optionally protected for liking/commenting
router.get("/", getPosts);

// Protected routes (require login)
router.use(protect);

router.post("/", createPost);
router.post("/:postId/like", toggleLike);
router.post("/:postId/comment", addComment);

export default router;
