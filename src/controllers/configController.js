import SystemConfig from "../models/systemConfig.js";

export const updateConfig = async (req, res, next) => {
    try {
        const { role, allowedDomains } = req.body;

        if (!role || !allowedDomains) {
            return res.status(400).json({ message: "Role and allowedDomains are required" });
        }

        const config = await SystemConfig.findOneAndUpdate(
            { role },
            { allowedDomains },
            { upsert: true, new: true }
        );

        res.json({ message: "Configuration updated successfully", config });
    } catch (error) {
        next(error);
    }
};

export const getConfig = async (req, res, next) => {
    try {
        const { role } = req.params;
        const config = await SystemConfig.findOne({ role });

        if (!config) {
            return res.status(404).json({ message: "Configuration not found for this role" });
        }

        res.json(config);
    } catch (error) {
        next(error);
    }
};
export const getAllConfigs = async (req, res, next) => {
    try {
        console.log("Fetching all configurations...");
        const configs = await SystemConfig.find();
        console.log("Configs found:", configs.length);
        res.json(configs);
    } catch (error) {
        console.error("Error in getAllConfigs:", error);
        next(error);
    }
};
