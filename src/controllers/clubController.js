import Club from "../models/club.js";
import User from "../models/user.js";
import ClubMember from "../models/clubMember.js";

// @desc    Create a new club
// @route   POST /api/clubs
// @access  Private/Admin/SuperAdmin
export const createClub = async (req, res, next) => {
    try {
        const { name, description, adminEmail, category, logo, banner } = req.body;

        if (!name || !adminEmail) {
            return res.status(400).json({ message: "Club name and admin email are required" });
        }

        // Find the user to be assigned as admin
        const user = await User.findOne({ email: adminEmail.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "No user found with the provided email. Please register the user first." });
        }

        // Check if the user is already an admin of another club
        const existingAdmin = await Club.findOne({ admin: user._id });
        if (existingAdmin) {
            return res.status(400).json({ message: "This student is already an admin of another club. Each admin can only manage one club." });
        }

        // Create the club
        const club = await Club.create({
            name,
            description,
            category,
            logo,
            banner,
            admin: user._id,
        });

        // Upgrade user role if they are a student
        if (user.role === "student") {
            user.role = "club_admin";
            await user.save();
        }

        // Add the admin as a member as well (optional but good practice)
        await ClubMember.create({
            club: club._id,
            user: user._id,
            role: "club_member" // The 'admin' field in Club model identifies the owner
        });

        res.status(201).json({
            message: "Club created successfully",
            club,
        });
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.admin) {
                return res.status(400).json({ message: "This student is already an admin of another club." });
            }
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
        const { clubId } = req.params;
        if (clubId) {
            const club = await Club.findById(clubId).populate("admin", "name email profileImage");
            if (!club) return res.status(404).json({ message: "Club not found" });
            return res.status(200).json(club);
        }
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
        const clubs = await Club.find({ admin: req.user._id });
        res.status(200).json(clubs);
    } catch (error) {
        next(error);
    }
};

// @desc    Get members of a club
// @route   GET /api/clubs/:clubId/members
// @access  Private
export const getClubMembers = async (req, res, next) => {
    try {
        const { clubId } = req.params;
        const members = await ClubMember.find({ club: clubId }).populate("user", "name email department studentId profileImage");
        res.status(200).json(members);
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
        const { studentEmail, role } = req.body;

        if (!studentEmail) {
            return res.status(400).json({ message: "Student email is required" });
        }

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ message: "Club not found" });
        }

        // Authorization check
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
        const existingMember = await ClubMember.findOne({ club: clubId, user: student._id });
        if (existingMember) {
            return res.status(400).json({ message: "Student is already a member of this club" });
        }

        const newMember = await ClubMember.create({
            club: clubId,
            user: student._id,
            role: role || "club_member",
        });

        res.status(200).json({
            message: "Member added successfully",
            member: newMember,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a member role
// @route   PATCH /api/clubs/:clubId/members/:userId/role
// @access  Private/ClubAdmin (or higher)
export const updateMemberRole = async (req, res, next) => {
    try {
        const { clubId, userId } = req.params;
        const { role } = req.body;

        if (!role || !["club_member", "event_host"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Auth check
        if (club.admin.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "superAdmin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        const member = await ClubMember.findOneAndUpdate(
            { club: clubId, user: userId },
            { role },
            { new: true }
        );

        if (!member) return res.status(404).json({ message: "Member record not found" });

        res.status(200).json({ message: "Role updated successfully", member });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove a member from a club
// @route   DELETE /api/clubs/:clubId/members/:userId
// @access  Private/ClubAdmin (or higher)
export const removeMember = async (req, res, next) => {
    try {
        const { clubId, userId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Auth check
        if (club.admin.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "superAdmin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Ensure we don't remove the admin (they must hand over admin first if needed)
        if (club.admin.toString() === userId) {
            return res.status(400).json({ message: "You cannot remove the club admin from the club" });
        }

        const result = await ClubMember.findOneAndDelete({ club: clubId, user: userId });
        if (!result) return res.status(404).json({ message: "Member record not found" });

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        next(error);
    }
};

// @desc    Update club settings
// @route   PUT /api/clubs/:clubId/settings
// @access  Private/ClubAdmin (or higher)
export const updateClubSettings = async (req, res, next) => {
    try {
        const { clubId } = req.params;
        const { name, description, logo, banner, gallery, socialLinks } = req.body;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Auth check
        if (club.admin.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "superAdmin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        // If name is changing, check for uniqueness
        if (name && name !== club.name) {
            const existing = await Club.findOne({ name });
            if (existing) return res.status(400).json({ message: "Club name already taken" });
            club.name = name;
        }

        if (description !== undefined) club.description = description;
        if (category !== undefined) club.category = category;
        if (logo !== undefined) club.logo = logo;
        if (banner !== undefined) club.banner = banner;
        if (gallery !== undefined) club.gallery = gallery;
        if (socialLinks !== undefined) club.socialLinks = socialLinks;

        await club.save();

        res.status(200).json({ message: "Club settings updated successfully", club });
    } catch (error) {
        next(error);
    }
};
