import Event from "../models/event.js";
import EventRegistration from "../models/EventRegistration.js";
import ClubMember from "../models/clubMember.js";
import QRCode from "qrcode";
import { uploadBuffer } from "../utils/cloudinary.js";
import { v4 as uuidv4 } from "uuid";
import { sendRegistrationEmail } from "../utils/email.js";

/**
 * @desc    Register for an event
 * @route   POST /api/registrations/event/:id
 * @access  Private
 */
export const registerForEvent = async (req, res, next) => {
    try {
        const { id: eventId } = req.params;
        const userId = req.user._id;
        const { department, yearOfStudy, expectations } = req.body;

        // 1. Check if the event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // 2. Check if the user is already registered
        const existingRegistration = await EventRegistration.findOne({ event: eventId, user: userId });
        if (existingRegistration) {
            return res.status(400).json({ message: "You are already registered for this event" });
        }

        // 3. Access Control Checks
        // Member Only
        if (event.ticketType === "Member Only") {
            const isMember = await ClubMember.findOne({ club: event.club, user: userId });
            if (!isMember) {
                return res.status(403).json({ message: "This event is exclusive to club members" });
            }
        }

        // 4. Capacity Control (Atomic Update)
        // We use findOneAndUpdate with the condition that registrations < capacity
        const updatedEvent = await Event.findOneAndUpdate(
            { 
                _id: eventId, 
                registrations: { $lt: event.capacity },
                status: { $ne: "Cancelled" }
            },
            { $inc: { registrations: 1 } },
            { new: true }
        );

        if (!updatedEvent) {
            // Check if it failed because it's full or another reason
            if (event.registrations >= event.capacity) {
                return res.status(400).json({ message: "This event is currently sold out" });
            }
            return res.status(400).json({ message: "Unable to register for this event" });
        }

        // 5. Generate QR Code
        const ticketId = `UCN-${uuidv4().substring(0, 8).toUpperCase()}-${eventId.toString().substring(eventId.toString().length - 4).toUpperCase()}`;
        
        // Data to encode in QR: ticketId and userId for validation
        const qrData = JSON.stringify({
            ticketId,
            eventId,
            userId
        });

        const qrBuffer = await QRCode.toBuffer(qrData, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // 6. Upload QR Code to Cloudinary
        const uploadResult = await uploadBuffer(qrBuffer, `uniconnect/tickets/${eventId}`);

        // 7. Save Registration Record
        const registration = await EventRegistration.create({
            event: eventId,
            user: userId,
            ticketId,
            qrCodeUrl: uploadResult.secure_url,
            registrationData: {
                department,
                yearOfStudy,
                expectations
            }
        });

        // 8. Send Confirmation Email (Async)
        // We wrap this in a try-catch so registration doesn't fail if SMTP has issues
        try {
            await sendRegistrationEmail(req.user, updatedEvent, registration);
        } catch (emailError) {
            console.error("Failed to send registration email:", emailError);
            // We don't return error to user because registration actually succeeded
        }

        const successMessage =
            updatedEvent.ticketType === "Paid"
                ? "You are registered. Entrance fee is paid at the door—bring the amount shown on the event page."
                : "Successfully registered for the event";

        res.status(201).json({
            message: successMessage,
            registration: {
                ...registration.toObject(),
                event: updatedEvent // Include updated event info
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get current user's registrations
 * @route   GET /api/registrations/my-tickets
 * @access  Private
 */
export const getMyRegistrations = async (req, res, next) => {
    try {
        const registrations = await EventRegistration.find({ user: req.user._id })
            .populate({
                path: "event",
                populate: {
                    path: "club",
                    select: "name profileImage"
                }
            });

        // Sort by event date ascending
        registrations.sort((a, b) => new Date(a.event.dateTime) - new Date(b.event.dateTime));

        res.status(200).json(registrations);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get registration details (ticket)
 * @route   GET /api/registrations/:id
 * @access  Private
 */
export const getRegistrationDetails = async (req, res, next) => {
    try {
        const registration = await EventRegistration.findById(req.params.id)
            .populate({
                path: "event",
                populate: {
                    path: "club",
                    select: "name profileImage description venue"
                }
            })
            .populate("user", "name studentId email");

        if (!registration) {
            return res.status(404).json({ message: "Registration not found" });
        }

        // Check if the user owns this registration
        if (registration.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to view this ticket" });
        }

        res.status(200).json(registration);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark attendance (Check-in) via QR or manual ID
 * @route   PATCH /api/registrations/mark-attendance
 * @access  Private (Club Admin/Event Host Only)
 */
export const markAttendance = async (req, res, next) => {
    try {
        const { ticketId, eventId } = req.body;
        const auditorId = req.user._id;

        if (!ticketId || !eventId) {
            return res.status(400).json({ message: "Ticket ID and Event ID are required" });
        }

        // 1. Fetch the event and populate club details for auth check
        const event = await Event.findById(eventId).populate("club");
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // 2. Authorization Check (Strictly Club Admin or Event Host)
        // Check if user is the Club Admin of the organizing club
        const isClubAdmin = event.club.admin.toString() === auditorId.toString();
        
        // Check if user is an Event Host in the organizing club
        const membership = await ClubMember.findOne({ club: event.club._id, user: auditorId });
        const isEventHost = membership && membership.role === "event_host";

        if (!isClubAdmin && !isEventHost) {
            return res.status(403).json({ message: "Not authorized to mark attendance for this event" });
        }

        // 3. Find the registration
        const registration = await EventRegistration.findOne({ ticketId, event: eventId }).populate("user", "name department studentId");
        
        if (!registration) {
            return res.status(404).json({ message: "Invalid ticket for this event" });
        }

        // 4. Check if already checked-in
        if (registration.status === "Checked-in") {
            return res.status(400).json({ 
                message: "This ticket has already been used for entry",
                student: registration.user 
            });
        }

        // 5. Update Registration
        registration.status = "Checked-in";
        registration.checkedInAt = Date.now();
        registration.checkedInBy = auditorId;
        await registration.save();

        res.status(200).json({
            message: "Attendance marked successfully!",
            student: {
                name: registration.user.name,
                department: registration.user.department || registration.registrationData?.department,
                studentId: registration.user.studentId
            }
        });

    } catch (error) {
        next(error);
    }
};
