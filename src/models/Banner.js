import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Banner description is required"],
    },
    linkText: {
      type: String,
      required: [true, "Button text is required"],
    },
    linkUrl: {
      type: String,
      required: [true, "Destination URL is required"],
    },
    imageUrl: {
      type: String,
      required: [false, "Image URL is optional"],
    },
    status: {
      type: String,
      enum: ["Active", "Scheduled", "Inactive"],
      default: "Active",
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    clicks: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    targetAudience: {
      type: String,
      enum: ["all", "student", "faculty", "club_admin"],
      default: "all",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;
