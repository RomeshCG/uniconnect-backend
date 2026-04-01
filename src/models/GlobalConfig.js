import mongoose from "mongoose";

const globalConfigSchema = new mongoose.Schema(
  {
    isEmergencyBlackout: {
      type: Boolean,
      default: false,
    },
    blackoutLevel: {
      type: String,
      enum: ["none", "readonly", "total"],
      default: "none",
    },
    maintenanceWindow: {
      title: { type: String, default: "Platform Maintenance" },
      message: { type: String, default: "We are currently undergoing maintenance. We'll be back soon!" },
      startDate: Date,
      endDate: Date,
      isActive: {
        type: Boolean,
        default: false,
      },
      granularControls: {
        disableEvents: { type: Boolean, default: false },
        disableRegistrations: { type: Boolean, default: false },
        disableQRScanners: { type: Boolean, default: false },
        disableLogin: { type: Boolean, default: false },
      },
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const GlobalConfig = mongoose.model("GlobalConfig", globalConfigSchema);

export default GlobalConfig;
