import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer to Cloudinary as an image.
 * @param {Buffer} buffer - The image buffer to upload.
 * @param {string} folder - The folder to store the image in.
 * @returns {Promise<Object>} - The Cloudinary upload result.
 */
export const uploadBuffer = async (buffer, folder = "uniconnect/qrcodes") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export default cloudinary;
