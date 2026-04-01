import ClubApplication from "../models/ClubApplication.js";
import ClubMember from "../models/clubMember.js";
import User from "../models/user.js";
import { sendClubApplicationStatusEmail } from "../utils/email.js";

export const applyToClub = async (req, res) => {
    try {
        const { clubId, department, reason } = req.body;
        const userId = req.user.id;

        // Fetch user info from the model as requested by the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if there is already a pending or approved application
        const existingApplication = await ClubApplication.findOne({
            user: userId,
            club: clubId,
            status: { $in: ["pending", "approved"] }
        });

        if (existingApplication) {
            return res.status(400).json({ 
                message: existingApplication.status === "pending" 
                    ? "You already have a pending application for this club." 
                    : "You are already an approved member of this club."
            });
        }

        const newApplication = new ClubApplication({
            user: userId,
            club: clubId,
            fullName: user.name,
            studentId: user.studentId || "N/A", // Ensure studentId exists
            department,
            reason,
        });

        await newApplication.save();

        res.status(201).json({ message: "Application submitted successfully!", application: newApplication });
    } catch (error) {
        console.error("Error applying to club:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getClubApplications = async (req, res) => {
    try {
        const { clubId } = req.params;
        
        // In a real app, verify that req.user is the admin of this club
        // For now, assuming middleware handles it or we'll add a check here if needed.
        
        const applications = await ClubApplication.find({ club: clubId })
            .sort({ requestedAt: -1 })
            .populate("user", "name email profileImage");

        res.status(200).json(applications);
    } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, reviewNotes } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const application = await ClubApplication.findById(applicationId)
            .populate("club", "name banner logo")
            .populate("user", "name email");

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        if (application.status !== "pending") {
            return res.status(400).json({ message: "Application has already been processed" });
        }

        application.status = status;
        application.reviewNotes = reviewNotes;
        application.reviewedAt = Date.now();
        await application.save();

        if (status === "approved") {
            // Add user to the club members
            const newMember = new ClubMember({
                club: application.club._id,
                user: application.user._id,
                role: "club_member",
            });
            await newMember.save();
        }

        // Send email notification
        try {
            await sendClubApplicationStatusEmail(application.user, application.club, status);
        } catch (emailError) {
            console.error("Error sending status email:", emailError);
            // Don't fail the request if email fails, but log it
        }

        res.status(200).json({ 
            message: `Application ${status} successfully`, 
            application 
        });
    } catch (error) {
        console.error("Error updating application status:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
