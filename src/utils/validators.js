import { z } from "zod";

export const validateRequest = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.errors.map((err) => ({
                    path: err.path.join("."),
                    message: err.message,
                })),
            });
        }
        next(error);
    }
};

export const postSchema = z.object({
    title: z.string().max(150, "Title cannot exceed 150 characters").optional().default(""),
    content: z
        .string()
        .min(1, "Content is required")
        .max(2200, "Content cannot exceed 2200 characters"),
    image: z.string().optional(),
    category: z.enum(["Post", "Announcement", "Event Update", "Member Spotlight"]).optional(),
    status: z.enum(["Draft", "Published"]).optional(),
});

export const eventSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(10, "Description must be at least 10 characters"),
    banner: z.string().optional(),
    dateTime: z.string().refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date > new Date();
    }, {
        message: "Event date must be in the future",
    }),
    venue: z.string().min(3, "Venue must be at least 3 characters"),
    capacity: z.coerce.number().int().positive("Capacity must be a positive integer"),
    ticketType: z.enum(["Free for Students", "Paid", "Member Only", "Open to All"]),
    status: z.enum(["Draft", "Published", "Sold Out", "Cancelled"]).optional(),
});
