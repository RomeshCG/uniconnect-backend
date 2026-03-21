import Club from "../models/club.js";
import User from "../models/user.js";

// @desc    Create a new club
// @route   POST /api/clubs
// @access  Private/Admin/SuperAdmin
export const createClub = async (req, res, next) => {
    try {
        const { name, description, adminEmail } = req.body;

        if (!name || !adminEmail) {
            return res.status(400).json({ message: "Club name and admin email are required" });
        }

        // Find the user to be assigned as admin
        const user = await User.findOne({ email: adminEmail.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "No user found with the provided email. Please register the user first." });
        }

        // Create the club
        const club = await Club.create({
            name,
            description,
            admin: user._id,
            members: [],
        });

        // Upgrade user role if they are a student
        if (user.role === "student") {
            user.role = "club_admin";
            await user.save();
        }

        res.status(201).json({
            message: "Club created successfully",
            club,
        });
    } catch (error) {
        // Handle duplicate name error
        if (error.code === 11000) {
            return res.status(400).json({ message: "A club with this name already exists" });
        }
        next(error);
    }
};

// @desc    Get all clubs
// @route   GET /api/clubs
// @access  Private
export const getClubs = async (req, res, next) => {
    try {
        const clubs = await Club.find().populate("admin", "name email profileImage");
        res.status(200).json(clubs);
    } catch (error) {
        next(error);
    }
};

// @desc    Get clubs where current user is admin
// @route   GET /api/clubs/mine
// @access  Private/ClubAdmin
export const getMyClubs = async (req, res, next) => {
    try {
        const clubs = await Club.find({ admin: req.user._id }).populate("members", "name email department studentId");
        res.status(200).json(clubs);
    } catch (error) {
        next(error);
    }
};

// @desc    Add a member to a club
// @route   POST /api/clubs/:clubId/members
// @access  Private/ClubAdmin (or higher)
export const addMember = async (req, res, next) => {
    try {
        const { clubId } = req.params;
        const { studentEmail } = req.body;

        if (!studentEmail) {
            return res.status(400).json({ message: "Student email is required" });
        }

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ message: "Club not found" });
        }

        // Verify the requester is the admin of this club (or is an admin/superAdmin)
        const isClubAdmin = club.admin.toString() === req.user._id.toString();
        const hasHighPrivilege = req.user.role === "admin" || req.user.role === "superAdmin";

        if (!isClubAdmin && !hasHighPrivilege) {
            return res.status(403).json({ message: "You are not authorized to manage members for this club" });
        }

        const student = await User.findOne({ email: studentEmail.toLowerCase() });
        if (!student) {
            return res.status(404).json({ message: "No student found with this email" });
        }

        // Check if already a member
        if (club.members.includes(student._id)) {
            return res.status(400).json({ message: "Student is already a member of this club" });
        }

        club.members.push(student._id);
        await club.save();

        res.status(200).json({
            message: "Member added successfully",
            club,
        });
    } catch (error) {
        next(error);
    }
};
