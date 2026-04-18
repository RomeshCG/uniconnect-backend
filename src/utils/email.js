import nodemailer from "nodemailer";
import { EMAIL_TEMPLATE_KEYS } from "../constants/emailTemplates.js";
import { getResolvedEmailTemplateByKey, renderEmailTemplate } from "./emailTemplateService.js";

const getTransporter = () =>
    nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

const getClientBaseUrl = () =>
    process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",")[0] : "http://localhost:5173";

export const sendOtpEmail = async (email, otp) => {
    const transporter = getTransporter();
    const template = await getResolvedEmailTemplateByKey(EMAIL_TEMPLATE_KEYS.OTP);
    const variables = {
        otp,
        year: new Date().getFullYear(),
    };

    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: renderEmailTemplate(template?.subject || "", variables),
        html: renderEmailTemplate(template?.html || "", variables),
    };

    await transporter.sendMail(mailOptions);
};

export const sendRegistrationEmail = async (user, event, registration) => {
    const transporter = getTransporter();
    const template = await getResolvedEmailTemplateByKey(EMAIL_TEMPLATE_KEYS.REGISTRATION_SUCCESS);
    const ticketLink = `${getClientBaseUrl()}/my-tickets`;
    const variables = {
        user_name: user?.name || "Student",
        event_title: event?.title || "Event",
        event_date: event?.dateTime ? new Date(event.dateTime).toLocaleDateString() : "",
        event_time: event?.dateTime ? new Date(event.dateTime).toLocaleTimeString() : "",
        event_venue: event?.venue || "TBA",
        ticket_id: registration?.ticketId || "",
        ticket_link: ticketLink,
        year: new Date().getFullYear(),
    };
    
    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: renderEmailTemplate(template?.subject || "", variables),
        html: renderEmailTemplate(template?.html || "", variables),
    };

    await transporter.sendMail(mailOptions);
};

export const sendClubApplicationStatusEmail = async (user, club, status) => {
    const transporter = getTransporter();

    const isApproved = status === "approved";
    const templateKey = isApproved
        ? EMAIL_TEMPLATE_KEYS.CLUB_APPLICATION_APPROVED
        : EMAIL_TEMPLATE_KEYS.CLUB_APPLICATION_REJECTED;
    const template = await getResolvedEmailTemplateByKey(templateKey);
    const variables = {
        user_name: user?.name || "Student",
        club_name: club?.name || "Club",
        club_link: `${getClientBaseUrl()}/clubs/${club?._id || ""}`,
        year: new Date().getFullYear(),
    };

    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: renderEmailTemplate(template?.subject || "", variables),
        html: renderEmailTemplate(template?.html || "", variables),
    };

    await transporter.sendMail(mailOptions);
};

export const sendEventReminderEmail = async (user, event, payload = {}) => {
    const transporter = getTransporter();
    const template = await getResolvedEmailTemplateByKey(EMAIL_TEMPLATE_KEYS.EVENT_REMINDER);
    const eventLink = `${getClientBaseUrl()}/events/${event?._id || ""}`;
    const variables = {
        user_name: user?.name || "Student",
        event_title: event?.title || "Event",
        event_date: event?.dateTime ? new Date(event.dateTime).toLocaleDateString() : "",
        event_time: event?.dateTime ? new Date(event.dateTime).toLocaleTimeString() : "",
        event_venue: event?.venue || "TBA",
        event_link: eventLink,
        message: payload.message || "Your event is starting soon.",
        time_until: payload.time_until || "soon",
        year: new Date().getFullYear(),
    };

    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: renderEmailTemplate(template?.subject || "", variables),
        html: renderEmailTemplate(template?.html || "", variables),
    };

    await transporter.sendMail(mailOptions);
};
