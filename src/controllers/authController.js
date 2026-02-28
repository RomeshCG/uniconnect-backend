import User from "../models/user.js";
import Otp from "../models/otp.js";
import SystemConfig from "../models/systemConfig.js";
import { generateOtp, validatePassword } from "../utils/authUtils.js";
import { sendOtpEmail } from "../utils/email.js";
import { generateToken } from "../utils/jwt.js";

//signup
export const signup = async (req, res, next) => {
    try {
        const { name, email, password, role, studentId, department } = req.body;

        // 1. Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // 2. Fetch config for role
        const config = await SystemConfig.findOne({ role: role || "student" });
        if (config && config.allowedDomains && config.allowedDomains.length > 0) {
            const domainValid = config.allowedDomains.some((domain) => email.endsWith(domain));
            if (!domainValid) {
                return res.status(400).json({ message: `Email domain not allowed for ${role || "student"} role` });
            }
        }

        // 3. Validate password strength
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({ message: passwordCheck.message });
        }

        // 4. Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || "student",
            studentId,
            department,
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

//login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Find user and check password
        const user = await User.findOne({ email }).select("+password");
        if (!user || !(await user.comparePassword(password, user.password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 2. Generate and save OTP
        const otpCode = generateOtp();
        await Otp.deleteMany({ email }); // Clear old OTPs
        await Otp.create({ email, otp: otpCode });

        // 3. Send OTP email
        try {
            await sendOtpEmail(email, otpCode);
        } catch (err) {
            console.error("Email send error:", err);
            return res.status(500).json({ message: "Error sending OTP email. Please try again later." });
        }

        res.json({ message: "OTP sent to your email" });
    } catch (error) {
        next(error);
    }
};

//verify otp
export const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        // 1. Check OTP
        const otpRecord = await Otp.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // 2. Find User
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Update verification timestamp
        user.lastEmailVerification = Date.now();
        await user.save();

        // 4. Issue token
        const token = generateToken({ id: user._id, role: user.role });

        // 5. Set cookie for 14 days
        res.cookie("sessionToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        });

        // Delete used OTP
        await Otp.deleteOne({ _id: otpRecord._id });

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};
