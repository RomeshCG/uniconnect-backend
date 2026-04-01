import GlobalConfig from "../models/GlobalConfig.js";

/**
 * @desc    Middleware to enforce system-wide blackout/maintenance modes
 */
export const blackoutMiddleware = async (req, res, next) => {
  try {
    // 1. Skip check for static files, public paths, and the system config itself for admins
    if (req.path.includes("/system/config") || req.path.includes("/auth/login")) {
      return next();
    }

    // 2. Fetch platform state (cached if possible, but for emergency, direct is safer)
    const config = await GlobalConfig.findOne();
    
    // If no config or blackout is off, proceed
    if (!config || (config.blackoutLevel === "none" && !config.isEmergencyBlackout)) {
      return next();
    }

    // 3. Admin Exemption (Admins and SuperAdmins can always bypass)
    const user = req.user; // Assumes authMiddleware has run
    if (user && (user.role === "admin" || user.role === "superAdmin")) {
      return next();
    }

    // Determine effective blackout level
    // If isEmergencyBlackout is true but level is none, treat as total lockdown
    const effectiveLevel = config.isEmergencyBlackout && config.blackoutLevel === "none" 
      ? "total" 
      : config.blackoutLevel;

    // 4. Enforce Levels
    if (effectiveLevel === "total") {
      return res.status(503).json({
        status: "maintenance",
        title: config.maintenanceWindow?.title || "System Lockdown",
        message: config.maintenanceWindow?.message || "Platform is currently under emergency maintenance. All services are suspended.",
        level: "total"
      });
    }

    if (effectiveLevel === "readonly") {
      // Block modifying requests (POST, PUT, DELETE, PATCH)
      if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        return res.status(503).json({
          status: "maintenance",
          title: "Read-Only Mode",
          message: "The platform is currently in read-only mode. You can browse, but modifications are restricted.",
          level: "readonly"
        });
      }
    }

    next();
  } catch (error) {
    console.error("Blackout Middleware Error:", error);
    next(); // Fallback to avoid breaking the platform on db error
  }
};
