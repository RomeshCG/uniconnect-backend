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

const postCategories = z.enum([
    "Announcement",
    "Post",
    "Event Update",
    "Member Spotlight",
    "General",
    "Event",
    "Resource",
]);

const resourceTopicEnum = z.enum([
    "Lecture Notes",
    "Assignments",
    "Tutorials",
    "Past Papers",
    "General",
]);

export const postSchema = z
    .object({
        content: z
            .string()
            .min(1, "Content is required")
            .max(2200, "Content cannot exceed 2200 characters"),
        media: z.string().max(2048).optional().default(""),
        category: postCategories.optional().default("Post"),
        title: z.string().max(200).optional().default(""),
        resourceCategory: resourceTopicEnum.optional(),
        fileName: z.string().max(255).optional().default(""),
        mimeType: z.string().max(128).optional().default(""),
        fileSizeBytes: z.coerce.number().int().min(0).optional(),
        cloudinaryPublicId: z.string().max(512).optional().default(""),
    })
    .superRefine((data, ctx) => {
        if (data.category === "Resource") {
            if (!data.media?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Upload a file first, then publish the resource with the returned URL in media.",
                    path: ["media"],
                });
            }
            if (!data.title?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Title is required for resources.",
                    path: ["title"],
                });
            }
        }
    });

/** Updates — no refinements (Zod v4 disallows `.partial()` on refined schemas); rules enforced in controller */
export const postUpdateSchema = z.object({
    content: z.string().min(1).max(2200).optional(),
    media: z.string().max(2048).optional(),
    category: postCategories.optional(),
    title: z.string().max(200).optional(),
    resourceCategory: resourceTopicEnum.optional(),
    fileName: z.string().max(255).optional(),
    mimeType: z.string().max(128).optional(),
    fileSizeBytes: z.coerce.number().int().min(0).optional(),
    cloudinaryPublicId: z.string().max(512).optional(),
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
