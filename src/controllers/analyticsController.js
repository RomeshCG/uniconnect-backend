import Club from "../models/club.js";
import User from "../models/user.js";
import Event from "../models/event.js";
import EventRegistration from "../models/EventRegistration.js";

/**
 * @desc    Get aggregate club analytics
 * @route   GET /api/analytics/clubs
 * @access  Private (Admin/SuperAdmin)
 */
export const getClubAnalytics = async (req, res, next) => {
  try {
    const totalClubs = await Club.countDocuments();
    const bannedClubs = await Club.countDocuments({ isBanned: true });
    const activeClubsCount = totalClubs - bannedClubs;

    // Status Distribution
    const statusDistribution = [
      { name: "Active", value: activeClubsCount, color: "#4f46e5" },
      { name: "Banned", value: bannedClubs, color: "#ef4444" },
    ];

    // Category Distribution
    const categoryStats = await Club.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // KPI Stats
    const totalMembers = await User.countDocuments({ role: "student" });
    const activeEvents = await Event.countDocuments({ status: "Published", date: { $gte: new Date() } });

    res.status(200).json({
      summary: {
        totalClubs,
        activeClubs: activeClubsCount,
        bannedClubs,
        memberReach: totalMembers,
        activeEvents,
        retentionRate: "94%" // Placeholder or calculate based on activity
      },
      statusDistribution,
      categoryStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregate engagement analytics (User Engagement)
 * @route   GET /api/analytics/engagement
 * @access  Private (Admin/SuperAdmin)
 */
export const getEngagementAnalytics = async (req, res, next) => {
  try {
    // Total User Count (includes all roles as requested)
    const totalUsers = await User.countDocuments();
    const studentsCount = await User.countDocuments({ role: "student" });
    const adminsCount = await User.countDocuments({ role: { $in: ["admin", "superAdmin", "club_admin"] } });

    // User Registration Trends (New users over time)
    const engagementTrends = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $project: { date: "$_id", count: 1, _id: 0 } },
      { $sort: { date: 1 } },
      { $limit: 12 }
    ]);

    // Departmental Outlook (User counts by department)
    const departmentStats = await User.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // Role-wise Breakdown for visualization
    const roleDistribution = [
      { name: "Students", count: studentsCount, color: "#6366f1" },
      { name: "Administrators", count: adminsCount, color: "#8b5cf6" }
    ];

    // Format departmental participation for UI
    const participationByDepartment = departmentStats.map((item, index) => ({
      department: item.name || "General/Other",
      count: item.count,
      color: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"][index % 4]
    }));

    res.status(200).json({
      summary: {
        totalUsers,
        studentsCount,
        adminsCount,
        activityScore: ((studentsCount / totalUsers) * 100).toFixed(1) // Active ratio
      },
      engagementTrends,
      participationByDepartment,
      roleDistribution
    });
  } catch (error) {
    next(error);
  }
};
