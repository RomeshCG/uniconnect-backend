import mongoose from "mongoose";
import Event from "../models/event.js";
import Club from "../models/club.js";
import ClubMember from "../models/clubMember.js";

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/ClubAdmin (or higher)
export const createEvent = async (req, res, next) => {
    try {
        const {
            title,
            description,
            banner,
            dateTime,
            venue,
            capacity,
            ticketType,
            status,
            location,
            ticketPrice,
            paymentInstructions,
        } = req.body;

        // Find the club management status
        let club = await Club.findOne({ admin: req.user._id });
        
        // If not the owner, check if the user is an event_host or club_admin member
        if (!club) {
            const membership = await ClubMember.findOne({ 
                user: req.user._id, 
                role: { $in: ["event_host", "club_admin"] } 
            });
            if (membership) {
                club = await Club.findById(membership.club);
            }
        }

        if (!club && ["club_admin", "event_host"].includes(req.user.role)) {
            return res.status(403).json({ message: "You must be a manager for a registered club to create events." });
        }

        if (!club && (req.user.role === "admin" || req.user.role === "superAdmin")) {
            return res.status(400).json({ message: "Admins must specify a clubId" });
        }

        const isPaid = ticketType === "Paid";
        const event = await Event.create({
            title,
            description,
            banner,
            dateTime,
            venue,
            capacity,
            ticketType,
            ticketPrice: isPaid ? Number(ticketPrice) : 0,
            paymentInstructions: isPaid ? (paymentInstructions || "").trim() : "",
            location: location || { lat: 6.9271, lng: 79.8612 },
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
        const { clubId } = req.query;

        if (clubId) {
            if (!mongoose.Types.ObjectId.isValid(clubId)) {
                return res.status(400).json({ message: "Invalid club id" });
            }
            query.club = clubId;
            // Public club profile: only published events for this club
            query.status = "Published";
        } else if (req.user.role === "student") {
            query.status = "Published";
        }

        const events = await Event.find(query)
            .populate("club", "name logo")
            .sort({ dateTime: 1 });

        res.status(200).json(events);
    } catch (error) {
        next(error);
    }
};

// @desc    Get related upcoming events
// @route   GET /api/events/:id/recommendations
// @access  Private
export const getRelatedEvents = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = 3 } = req.query;
        const maxItems = Math.min(Number(limit) || 3, 12);
        const now = new Date();

        const event = await Event.findById(id).select("_id club");
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const baseQuery = {
            _id: { $ne: event._id },
            status: "Published",
            dateTime: { $gte: now },
        };

        // Prioritize events from the same club first for relevance.
        const sameClubEvents = await Event.find({ ...baseQuery, club: event.club })
            .populate("club", "name")
            .sort({ dateTime: 1 })
            .limit(maxItems);

        const remaining = maxItems - sameClubEvents.length;
        if (remaining <= 0) {
            return res.status(200).json(sameClubEvents);
        }

        const sameClubIds = sameClubEvents.map((item) => item._id);
        const otherEvents = await Event.find({
            ...baseQuery,
            _id: { $nin: [event._id, ...sameClubIds] },
        })
            .populate("club", "name")
            .sort({ dateTime: 1 })
            .limit(remaining);

        return res.status(200).json([...sameClubEvents, ...otherEvents]);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's club events
// @route   GET /api/events/mine
// @access  Private/ClubAdmin
export const getMyClubEvents = async (req, res, next) => {
    try {
        // 1. Find clubs where user is the primary Admin
        const ownedClubs = await Club.find({ admin: req.user._id }).select("_id");
        const ownedClubIds = ownedClubs.map(c => c._id);

        // 2. Find clubs where user is an Event Host or Club Admin member
        const managementMemberships = await ClubMember.find({ 
            user: req.user._id, 
            role: { $in: ["event_host", "club_admin"] } 
        }).select("club");
        const hostedClubIds = managementMemberships.map(m => m.club);

        // 3. Combine unique club IDs
        const allManageableClubIds = [...new Set([...ownedClubIds, ...hostedClubIds])];

        if (allManageableClubIds.length === 0) {
            return res.status(200).json([]);
        }

        const events = await Event.find({ club: { $in: allManageableClubIds } })
            .populate("club", "name logo")
            .sort({ createdAt: -1 });
            
        res.status(200).json(events);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all events the user is authorized to manage (Admin or Host)
// @route   GET /api/events/manageable
// @access  Private
export const getManageableEvents = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // 1. Find clubs where user is the primary Admin
        const ownedClubs = await Club.find({ admin: userId }).select("_id");
        const ownedClubIds = ownedClubs.map(c => c._id);

        // 2. Find clubs where user is an Event Host
        const hostedMemberships = await ClubMember.find({ 
            user: userId, 
            role: "event_host" 
        }).select("club");
        const hostedClubIds = hostedMemberships.map(m => m.club);

        // 3. Combine unique club IDs
        const allManageableClubIds = [...new Set([...ownedClubIds, ...hostedClubIds])];

        // 4. Fetch events for these clubs
        const events = await Event.find({ 
            club: { $in: allManageableClubIds },
            status: { $ne: "Cancelled" } 
        })
        .populate("club", "name logo")
        .sort({ dateTime: -1 });

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
        // Authorization check: Only creator, high-level admins, OR club managers
        const isCreator = event.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";
        
        let isManager = false;
        if (!isCreator && !isAdmin) {
            const membership = await ClubMember.findOne({ 
                club: event.club, 
                user: req.user._id, 
                role: { $in: ["event_host", "club_admin"] } 
            });
            isManager = !!membership;
        }

        if (!isCreator && !isAdmin && !isManager) {
            return res.status(403).json({ message: "Not authorized to update this event" });
        }

        const nextType = req.body.ticketType ?? event.ticketType;
        const nextPrice =
            req.body.ticketPrice !== undefined ? Number(req.body.ticketPrice) : event.ticketPrice;
        if (nextType === "Paid" && (!nextPrice || nextPrice <= 0)) {
            return res.status(400).json({
                message: "Paid events require a ticket price greater than 0 (pay at the door)",
            });
        }

        const payload = { ...req.body };
        if (nextType !== "Paid") {
            payload.ticketPrice = 0;
            payload.paymentInstructions = "";
        } else if (payload.paymentInstructions !== undefined) {
            payload.paymentInstructions = String(payload.paymentInstructions).trim();
        }

        const updatedEvent = await Event.findByIdAndUpdate(id, payload, {
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
        // Authorization check
        const isCreator = event.createdBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin" || req.user.role === "superAdmin";
        
        let isManager = false;
        if (!isCreator && !isAdmin) {
            const membership = await ClubMember.findOne({ 
                club: event.club, 
                user: req.user._id, 
                role: { $in: ["event_host", "club_admin"] } 
            });
            isManager = !!membership;
        }

        if (!isCreator && !isAdmin && !isManager) {
            return res.status(403).json({ message: "Not authorized to delete this event" });
        }

        await event.deleteOne();
        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        next(error);
    }
};
// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id).populate({
            path: "club",
            select: "name description admin logo banner",
            populate: {
                path: "admin",
                select: "name profileImage"
            }
        });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check membership if user is logged in
        let isMember = false;
        if (req.user) {
            // Check if user is the admin of the club
            const isAdmin = event.club.admin._id.toString() === req.user._id.toString();
            
            // Check if user is a member
            const memberRecord = await ClubMember.findOne({ 
                club: event.club._id, 
                user: req.user._id 
            });
            
            isMember = isAdmin || !!memberRecord;
        }

        res.status(200).json({
            ...event.toObject(),
            isMember
        });
    } catch (error) {
        next(error);
    }
};
