export const EMAIL_TEMPLATE_KEYS = {
    OTP: "otp",
    REGISTRATION_SUCCESS: "registration_success",
    CLUB_APPLICATION_APPROVED: "club_application_approved",
    CLUB_APPLICATION_REJECTED: "club_application_rejected",
    EVENT_REMINDER: "event_reminder",
};

export const DEFAULT_EMAIL_TEMPLATES = {
    [EMAIL_TEMPLATE_KEYS.OTP]: {
        key: EMAIL_TEMPLATE_KEYS.OTP,
        name: "OTP Verification",
        subject: "Your UniConnect Verification Code",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">UniConnect Verification</h2>
                <p>Hello,</p>
                <p>Your 6-digit verification code is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; border: 1px solid #ccc;">
                        {{otp}}
                    </span>
                </div>
                <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; {{year}} UniConnect. All rights reserved.</p>
            </div>
        `,
    },
    [EMAIL_TEMPLATE_KEYS.REGISTRATION_SUCCESS]: {
        key: EMAIL_TEMPLATE_KEYS.REGISTRATION_SUCCESS,
        name: "Registration Success",
        subject: "Registration Confirmed: {{event_title}}",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">Registration Confirmed!</h2>
                <p>Hello <strong>{{user_name}}</strong>,</p>
                <p>You have successfully registered for <strong>{{event_title}}</strong>.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Event:</strong> {{event_title}}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> {{event_date}}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> {{event_time}}</p>
                    <p style="margin: 5px 0;"><strong>Venue:</strong> {{event_venue}}</p>
                    <p style="margin: 5px 0;"><strong>Ticket ID:</strong> {{ticket_id}}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{ticket_link}}" style="background: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        View Your Digital Ticket
                    </a>
                </div>
                <p>To view your ticket anytime, visit your dashboard and go to "My Tickets".</p>
                <p>We look forward to seeing you there!</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; {{year}} UniConnect. All rights reserved.</p>
            </div>
        `,
    },
    [EMAIL_TEMPLATE_KEYS.CLUB_APPLICATION_APPROVED]: {
        key: EMAIL_TEMPLATE_KEYS.CLUB_APPLICATION_APPROVED,
        name: "Club Application Approved",
        subject: "Welcome to {{club_name}}! Application Approved",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #10B981; text-align: center;">Application Approved</h2>
                <p>Hello <strong>{{user_name}}</strong>,</p>
                <p>Your application to join <strong>{{club_name}}</strong> has been reviewed by the club administrators.</p>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 18px; margin: 0;">Status: <strong style="color: #10B981; text-transform: uppercase;">APPROVED</strong></p>
                </div>
                <p>Congratulations! You are now a member of {{club_name}}. You can now participate in club activities, access exclusive content, and connect with other members.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{club_link}}" style="background: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Visit Club Page
                    </a>
                </div>
                <p>If you have any questions, please contact the club administration.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; {{year}} UniConnect. All rights reserved.</p>
            </div>
        `,
    },
    [EMAIL_TEMPLATE_KEYS.CLUB_APPLICATION_REJECTED]: {
        key: EMAIL_TEMPLATE_KEYS.CLUB_APPLICATION_REJECTED,
        name: "Club Application Rejected",
        subject: "Update regarding your application to {{club_name}}",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #EF4444; text-align: center;">Application Rejected</h2>
                <p>Hello <strong>{{user_name}}</strong>,</p>
                <p>Your application to join <strong>{{club_name}}</strong> has been reviewed by the club administrators.</p>
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 18px; margin: 0;">Status: <strong style="color: #EF4444; text-transform: uppercase;">REJECTED</strong></p>
                </div>
                <p>Thank you for your interest in {{club_name}}. Unfortunately, your application has not been accepted at this time.</p>
                <p>Don't be discouraged! You can always re-apply in the future or explore other clubs on UniConnect.</p>
                <p>If you have any questions, please contact the club administration.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; {{year}} UniConnect. All rights reserved.</p>
            </div>
        `,
    },
    [EMAIL_TEMPLATE_KEYS.EVENT_REMINDER]: {
        key: EMAIL_TEMPLATE_KEYS.EVENT_REMINDER,
        name: "Event Reminder",
        subject: "Reminder: {{event_title}} starts {{time_until}}",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">Event Reminder</h2>
                <p>Hello <strong>{{user_name}}</strong>,</p>
                <p>{{message}}</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Event:</strong> {{event_title}}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> {{event_date}}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> {{event_time}}</p>
                    <p style="margin: 5px 0;"><strong>Venue:</strong> {{event_venue}}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{event_link}}" style="background: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        View Event
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">&copy; {{year}} UniConnect. All rights reserved.</p>
            </div>
        `,
    },
};

export const getDefaultTemplateByKey = (key) => DEFAULT_EMAIL_TEMPLATES[key] || null;
