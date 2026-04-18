import Club from "../models/club.js";
import User from "../models/user.js";
import ClubMember from "../models/clubMember.js";
import Event from "../models/event.js";
import Post from "../models/post.js";

// @desc    Create a new club
// @route   POST /api/clubs
// @access  Private/Admin/SuperAdmin
export const createClub = async (req, res, next) => {
    try {
        const { name, description, mission, vision, adminEmail, category, logo, banner } = req.body;

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
            mission: typeof mission === "string" ? mission.trim() : "",
            vision: typeof vision === "string" ? vision.trim() : "",
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

        // Add the admin as a member; boardTitle is for leadership display (separate from permission role).
        await ClubMember.create({
            club: club._id,
            user: user._id,
            role: "club_member",
            boardTitle: "Club President",
            boardOrder: 0,
            showOnLeadershipBoard: true,
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

            // Fetch real statistics
            const [memberCount, eventCount, leadershipBoard] = await Promise.all([
                ClubMember.countDocuments({ club: clubId }),
                Event.countDocuments({ club: clubId, status: "Published" }),
                ClubMember.find({
                    club: clubId,
                    isBanned: { $ne: true },
                    $or: [
                        { showOnLeadershipBoard: true },
                        { boardTitle: { $regex: /\S/ } },
                    ],
                })
                    .populate("user", "name email department studentId profileImage")
                    .sort({ boardOrder: 1, createdAt: 1 })
                    .lean(),
            ]);

            // Check if requesting user is a member
            let isMember = false;
            if (req.user) {
                const membership = await ClubMember.findOne({ club: clubId, user: req.user._id });
                isMember = !!membership;
            }

            return res.status(200).json({
                ...club.toObject(),
                isMember,
                memberCount,
                eventCount,
                leadershipBoard,
            });
        }
        const clubs = await Club.find().populate("admin", "name email profileImage");

        const clubsWithStats = await Promise.all(clubs.map(async (club) => {
            const [memberCount, membership] = await Promise.all([
                ClubMember.countDocuments({ club: club._id }),
                req.user ? ClubMember.findOne({ club: club._id, user: req.user._id }) : null
            ]);
            
            return {
                ...club._doc,
                memberCount,
                isMember: !!membership
            };
        }));

        res.status(200).json(clubsWithStats);
    } catch (error) {
        next(error);
    }
};

// @desc    Get clubs where current user is admin
// @route   GET /api/clubs/mine
// @access  Private/ClubAdmin
export const getMyClubs = async (req, res, next) => {
    try {
        // Find clubs where user is owner
        const ownedClubs = await Club.find({ admin: req.user._id });

        // Find clubs where user is a manager (event_host or club_admin) via ClubMember
        const managementMemberships = await ClubMember.find({
            user: req.user._id,
            role: { $in: ["event_host", "club_admin"] }
        }).populate("club");

        const managementClubs = managementMemberships
            .map(m => m.club)
            .filter(c => c && c.admin.toString() !== req.user._id.toString()); // Only clubs they DON'T own

        // Combine and deduplicate
        const allManagedClubs = [...ownedClubs, ...managementClubs];
        res.status(200).json(allManagedClubs);
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
        const { studentEmail, role, boardTitle, boardOrder, showOnLeadershipBoard } = req.body;

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
            role: role && ["club_member", "event_host", "club_admin"].includes(role) ? role : "club_member",
            boardTitle: typeof boardTitle === "string" ? boardTitle.trim() : "",
            boardOrder: boardOrder !== undefined && boardOrder !== null ? Number(boardOrder) : 0,
            showOnLeadershipBoard: !!showOnLeadershipBoard,
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

        if (!role || !["club_member", "event_host", "club_admin"].includes(role)) {
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

        // Update the global User role as well
        const user = await User.findById(userId);
        if (user) {
            // Only upgrade to event_host if they are a student
            if (role === "event_host" && user.role === "student") {
                user.role = "event_host";
                await user.save();
            } else if (role === "club_member" && user.role === "event_host") {
                // If downgrading to member, check if they are host of any other club
                const otherHostRole = await ClubMember.findOne({
                    user: userId,
                    role: "event_host",
                    club: { $ne: clubId }
                });
                if (!otherHostRole) {
                    user.role = "student";
                    await user.save();
                }
            }
        }

        res.status(200).json({ message: "Role updated successfully", member });
    } catch (error) {
        console.error("Error in updateMemberRole:", error);
        next(error);
    }
};

// @desc    Update leadership board fields (boardTitle is separate from permission role)
// @route   PATCH /api/clubs/:clubId/members/:userId/board
// @access  Private/ClubAdmin (or higher)
export const updateMemberBoard = async (req, res, next) => {
    try {
        const { clubId, userId } = req.params;
        const { boardTitle, boardOrder, showOnLeadershipBoard } = req.body;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        if (club.admin.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "superAdmin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        const updates = {};
        if (boardTitle !== undefined) {
            updates.boardTitle = typeof boardTitle === "string" ? boardTitle.trim() : "";
        }
        if (boardOrder !== undefined && boardOrder !== null) {
            const n = Number(boardOrder);
            updates.boardOrder = Number.isFinite(n) ? n : 0;
        }
        if (showOnLeadershipBoard !== undefined) {
            updates.showOnLeadershipBoard = !!showOnLeadershipBoard;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No board fields to update" });
        }

        const member = await ClubMember.findOneAndUpdate(
            { club: clubId, user: userId },
            { $set: updates },
            { new: true }
        ).populate("user", "name email profileImage studentId department");

        if (!member) return res.status(404).json({ message: "Member record not found" });

        res.status(200).json({ message: "Leadership board updated", member });
    } catch (error) {
        next(error);
    }
};

// @desc    Club-scoped posts (news feed)
// @route   GET /api/clubs/:clubId/news
// @access  Public (optional auth)
export const getClubNews = async (req, res, next) => {
    try {
        const { clubId } = req.params;
        const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 12, 1), 40);

        const club = await Club.findById(clubId).select("_id");
        if (!club) return res.status(404).json({ message: "Club not found" });

        const posts = await Post.find({ club: clubId })
            .populate("author", "name profileImage studentId")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.status(200).json(posts);
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

// @desc    Toggle a member ban status
// @route   PATCH /api/clubs/:clubId/members/:userId/ban
// @access  Private/ClubAdmin (or higher)
export const toggleMemberBan = async (req, res, next) => {
    try {
        const { clubId, userId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Auth check
        if (club.admin.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "superAdmin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Ensure we don't ban the admin
        if (club.admin.toString() === userId) {
            return res.status(400).json({ message: "You cannot ban the club admin" });
        }

        const member = await ClubMember.findOne({ club: clubId, user: userId });
        if (!member) return res.status(404).json({ message: "Member record not found" });

        member.isBanned = !member.isBanned;
        await member.save();

        res.status(200).json({
            message: `Member ${member.isBanned ? "banned" : "unbanned"} successfully`,
            isBanned: member.isBanned
        });
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
        const { name, description, mission, vision, category, logo, banner, gallery, socialLinks } = req.body;

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
        if (mission !== undefined) club.mission = typeof mission === "string" ? mission.trim() : "";
        if (vision !== undefined) club.vision = typeof vision === "string" ? vision.trim() : "";
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

// @desc    Delete a club
// @route   DELETE /api/clubs/:clubId
// @access  Private/Admin/SuperAdmin
export const deleteClub = async (req, res, next) => {
    try {
        const { clubId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Delete the club
        await Club.findByIdAndDelete(clubId);

        // Delete all club members associated with this club
        await ClubMember.deleteMany({ club: clubId });

        // Delete all events associated with this club
        await Event.deleteMany({ club: clubId });

        // Delete all posts associated with this club
        await Post.deleteMany({ club: clubId });

        res.status(200).json({ message: "Club deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// @desc    Ban or Unban a club
// @route   PATCH /api/clubs/:clubId/ban
// @access  Private/Admin/SuperAdmin
export const toggleClubBan = async (req, res, next) => {
    try {
        const { clubId } = req.params;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });

        club.isBanned = !club.isBanned;
        await club.save();

        res.status(200).json({
            message: `Club ${club.isBanned ? "banned" : "unbanned"} successfully`,
            isBanned: club.isBanned,
        });
    } catch (error) {
        next(error);
    }
};
