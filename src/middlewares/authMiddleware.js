import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.js";

// @desc    Protect routes - Verify JWT and user
export const protect = async (req, res, next) => {
    try {
        let token;

        // 1. Get token from cookies or Auth header
        if (req.cookies?.sessionToken) {
            token = req.cookies.sessionToken;
        } else if (req.headers.authorization?.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "You are not logged in. Please login to get access." });
        }

        // 2. Verify token
        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token. Please login again." });
        }

        // 3. Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ message: "The user belonging to this token no longer exists." });
        }

        // 4. Grant access to protected route
        req.user = currentUser;
        next();
    } catch (error) {
        next(error);
    }
};

// @desc    Restrict access to certain roles
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "You do not have permission to perform this action" });
        }
        next();
    };
};

// @desc    Verify if last email verification was within 14 days
export const checkEmailVerification = async (req, res, next) => {
    try {
        const user = req.user;
        const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;

        if (Date.now() - new Date(user.lastEmailVerification).getTime() > fourteenDaysInMs) {
            return res.status(403).json({
                message: "Email re-verification required",
                reverify: true,
                email: user.email
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};
