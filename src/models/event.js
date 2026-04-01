import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Event title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Event description is required"],
            trim: true,
        },
        banner: {
            type: String, // URL to image
            default: "",
        },
        dateTime: {
            type: Date,
            required: [true, "Event date and time are required"],
        },
        venue: {
            type: String,
            required: [true, "Event venue is required"],
            trim: true,
        },
        location: {
            lat: { type: Number, default: 6.9271 }, // Default to Colombo/Univ
            lng: { type: Number, default: 79.8612 },
        },
        capacity: {
            type: Number,
            required: [true, "Capacity limit is required"],
            min: [1, "Capacity must be at least 1"],
        },
        ticketType: {
            type: String,
            required: [true, "Ticket type is required"],
            enum: ["Free for Students", "Paid", "Member Only", "Open to All"],
            default: "Free for Students",
        },
        status: {
            type: String,
            enum: ["Draft", "Published", "Sold Out", "Cancelled"],
            default: "Draft",
        },
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            required: [true, "Event must belong to a club"],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Event must have a creator"],
        },
        registrations: {
            type: Number,
            default: 0,
        },
        budget: {
            type: Number,
            default: 0,
        },
        ticketPrice: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
