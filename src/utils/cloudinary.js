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

/** PDF / Office etc. — stored as Cloudinary `raw` */
export const uploadRawBuffer = async (buffer, folder = "uniconnect/resources") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "raw",
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Parse public_id from a Cloudinary delivery URL for raw uploads.
 * Example path: /cloud_name/raw/upload/v123/uniconnect/resources/abc.pdf
 */
export function extractRawPublicIdFromCloudinaryUrl(url) {
    if (!url || typeof url !== "string") return null;
    try {
        const u = new URL(url);
        if (!u.hostname.toLowerCase().includes("cloudinary.com")) return null;
        const m = u.pathname.match(/\/raw\/upload\/(?:[^/]+\/)*(?:v\d+\/)?(.+)$/i);
        if (!m) return null;
        return decodeURIComponent(m[1].split("?")[0]) || null;
    } catch {
        return null;
    }
}

/** Delete a raw file from Cloudinary (best-effort; does not throw on not_found). */
export async function removeCloudinaryRawAsset(mediaUrl, storedPublicId) {
    const id =
        (storedPublicId && String(storedPublicId).trim()) ||
        extractRawPublicIdFromCloudinaryUrl(mediaUrl);
    if (!id) return;
    try {
        const r = await cloudinary.uploader.destroy(id, { resource_type: "raw", invalidate: true });
        if (r.result !== "ok" && r.result !== "not found") {
            console.warn("[cloudinary] destroy raw unexpected result:", r.result);
        }
    } catch (err) {
        console.error("[cloudinary] destroy raw failed:", err?.message || err);
    }
}

export default cloudinary;
