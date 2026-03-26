import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { protect } from "../middlewares/authMiddleware.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

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

export default router;
