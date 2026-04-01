import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Your UniConnect Verification Code",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">UniConnect Verification</h2>
                <p>Hello,</p>
                <p>Your 6-digit verification code is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; border: 1px solid #ccc;">
                        ${otp}
                    </span>
                </div>
                <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; ${new Date().getFullYear()} UniConnect. All rights reserved.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

export const sendRegistrationEmail = async (user, event, registration) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const ticketLink = `${process.env.CLIENT_URL.split(',')[0]}/my-tickets`;
    
    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: `Registration Confirmed: ${event.title}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">Registration Confirmed!</h2>
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>You have successfully registered for <strong>${event.title}</strong>.</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(event.dateTime).toLocaleDateString()}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date(event.dateTime).toLocaleTimeString()}</p>
                    <p style="margin: 5px 0;"><strong>Venue:</strong> ${event.venue}</p>
                    <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${registration.ticketId}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${ticketLink}" style="background: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        View Your Digital Ticket
                    </a>
                </div>

                <p>To view your ticket anytime, visit your dashboard and go to "My Tickets".</p>
                <p>We look forward to seeing you there!</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; ${new Date().getFullYear()} UniConnect. All rights reserved.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

export const sendClubApplicationStatusEmail = async (user, club, status) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const isApproved = status === "approved";
    const subject = isApproved 
        ? `Welcome to ${club.name}! Application Approved` 
        : `Update regarding your application to ${club.name}`;

    const mailOptions = {
        from: `"UniConnect" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: ${isApproved ? '#10B981' : '#EF4444'}; text-align: center;">
                    Application ${isApproved ? 'Approved' : 'Rejected'}
                </h2>
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>Your application to join <strong>${club.name}</strong> has been reviewed by the club administrators.</p>
                
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 18px; margin: 0;">Status: <strong style="color: ${isApproved ? '#10B981' : '#EF4444'}; text-transform: uppercase;">${status}</strong></p>
                </div>

                ${isApproved ? `
                    <p>Congratulations! You are now a member of ${club.name}. You can now participate in club activities, access exclusive content, and connect with other members.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : 'http://localhost:5173'}/clubs/${club._id}" style="background: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Visit Club Page
                        </a>
                    </div>
                ` : `
                    <p>Thank you for your interest in ${club.name}. Unfortunately, your application has not been accepted at this time.</p>
                    <p>Don't be discouraged! You can always re-apply in the future or explore other clubs on UniConnect.</p>
                `}
                
                <p>If you have any questions, please contact the club administration.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; ${new Date().getFullYear()} UniConnect. All rights reserved.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};
