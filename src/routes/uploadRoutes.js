import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { uploadRawBuffer } from "../utils/cloudinary.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const RESOURCE_MIMES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const resourceUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (RESOURCE_MIMES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, Word, and PowerPoint files are allowed."), false);
        }
    },
});

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "uniconnect/uploads",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 1000, height: 1000, crop: "limit" }]
    }
});

const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @desc    Upload single image to Cloudinary
// @route   POST /api/upload/single
// @access  Private
router.post("/single", protect, upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Cloudinary returns the URL in req.file.path or req.file.secure_url depending on version/config
    const fileUrl = req.file.path || req.file.secure_url;
    
    res.status(200).json({
        message: "Image uploaded successfully to Cloudinary",
        url: fileUrl
    });
});

// @desc    Upload a resource file (PDF / Word / PowerPoint) for university materials
// @route   POST /api/upload/resource
// @access  club_admin | admin | superAdmin
router.post(
    "/resource",
    protect,
    restrictTo("club_admin", "admin", "superAdmin"),
    resourceUpload.single("file"),
    async (req, res, next) => {
        try {
            if (!req.file?.buffer) {
                return res.status(400).json({ message: "No file uploaded" });
            }
            const result = await uploadRawBuffer(req.file.buffer, "uniconnect/resources");
            const url = result.secure_url || result.url;
            res.status(200).json({
                message: "Resource file uploaded successfully",
                url,
                publicId: result.public_id,
                bytes: result.bytes ?? req.file.size,
                originalFilename: req.file.originalname,
                mimeType: req.file.mimetype,
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
