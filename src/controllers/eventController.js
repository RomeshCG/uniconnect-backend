import Event from "../models/event.js";
import Club from "../models/club.js";

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/ClubAdmin (or higher)
export const createEvent = async (req, res, next) => {
    try {
        const { title, description, banner, dateTime, venue, capacity, ticketType, status } = req.body;

        // Find the club owned by this user (or if admin, they might need to specify a club, but for now we assume club_admin logic)
        const club = await Club.findOne({ admin: req.user._id });
        if (!club && req.user.role === "club_admin") {
            return res.status(403).json({ message: "You must be a club admin for a registered club to create events." });
        }

        // Default to a system club or allow admins to pick? 
        // For now, let's keep it simple: must have a club.
        if (!club && (req.user.role === "admin" || req.user.role === "superAdmin")) {
            return res.status(400).json({ message: "Admins must specify a clubId (Implementation pending for direct admin creation without club context)" });
        }

        const event = await Event.create({
            title,
            description,
            banner,
            dateTime,
            venue,
            capacity,
            ticketType,
            status: status || "Draft",
            club: club._id,
            createdBy: req.user._id
        });

        res.status(201).json({ message: "Event created successfully", event });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Private
export const getEvents = async (req, res, next) => {
    try {
        let query = {};

        // Students and guest roles only see published events
        if (req.user.role === "student") {
            query.status = "Published";
        }

        const events = await Event.find(query)
            .populate("club", "name")
            .sort({ dateTime: 1 });

        res.status(200).json(events);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's club events
// @route   GET /api/events/mine
// @access  Private/ClubAdmin
export const getMyClubEvents = async (req, res, next) => {
    try {
        const club = await Club.findOne({ admin: req.user._id });
        if (!club) {
            return res.status(200).json([]);
        }

        const events = await Event.find({ club: club._id }).sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (error) {
        next(error);
    }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Owner/Admin
export const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Authorization check: Only creator or high-level admins
        const isCreator = event.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to update this event" });
        }

        const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ message: "Event updated successfully", event: updatedEvent });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Owner/Admin
export const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Authorization check
        const isCreator = event.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this event" });
        }

        await event.deleteOne();
        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        next(error);
    }
};
