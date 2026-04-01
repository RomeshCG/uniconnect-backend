import User from "../models/user.js";

// @desc    Get all users with filtering
// @route   GET /api/users
// @access  Private/SuperAdmin
export const getAllUsers = async (req, res, next) => {
    try {
        const { department, role, search } = req.query;
        let query = {};

        if (department) query.department = department;
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { studentId: { $regex: search, $options: "i" } }
            ];
        }

        const users = await User.find(query).sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle user ban status
// @route   PATCH /api/users/:id/ban
// @access  Private/SuperAdmin
export const toggleUserBan = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Prevent superAdmin from banning themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot ban yourself" });
        }

        user.isBanned = !user.isBanned;
        await user.save();

        res.status(200).json({
            message: `User ${user.isBanned ? "banned" : "unbanned"} successfully`,
            isBanned: user.isBanned
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/SuperAdmin
export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot delete yourself" });
        }

        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        next(error);
    }
};
