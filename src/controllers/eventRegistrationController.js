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

        res.status(201).json({
            message: "Successfully registered for the event",
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
