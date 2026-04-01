import mongoose from "mongoose";

const eventRegistrationSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: [true, "Registration must belong to an event"],
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Registration must belong to a user"],
        },
        ticketId: {
            type: String,
            required: [true, "Ticket ID is required"],
            unique: true,
        },
        qrCodeUrl: {
            type: String,
            required: [true, "QR Code URL is required"],
        },
        registrationData: {
            department: String,
            yearOfStudy: String,
            expectations: String,
        },
        status: {
            type: String,
            enum: ["Confirmed", "Cancelled", "Checked-in"],
            default: "Confirmed",
        },
        registeredAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a user can only register for an event once
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });

const EventRegistration = mongoose.model("EventRegistration", eventRegistrationSchema);

export default EventRegistration;
