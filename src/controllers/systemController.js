import Banner from "../models/Banner.js";
import GlobalConfig from "../models/GlobalConfig.js";

/**
 * @desc    Get all promotion banners
 * @route   GET /api/system/banners
 * @access  Private (Admin/SuperAdmin)
 */
export const getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ priority: 1, createdAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a promotion banner
 * @route   POST /api/system/banners
 * @access  Private (Admin/SuperAdmin)
 */
export const createBanner = async (req, res, next) => {
  try {
    const banner = await Banner.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(banner);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a promotion banner
 * @route   PUT /api/system/banners/:id
 * @access  Private (Admin/SuperAdmin)
 */
export const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json(banner);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a promotion banner
 * @route   DELETE /api/system/banners/:id
 * @access  Private (Admin/SuperAdmin)
 */
export const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get global system configuration (blackout/maintenance)
 * @route   GET /api/system/config
 * @access  Private (Admin/SuperAdmin/All)
 */
export const getSystemConfig = async (req, res, next) => {
  try {
    let config = await GlobalConfig.findOne();
    if (!config) {
      config = await GlobalConfig.create({ isEmergencyBlackout: false });
    }
    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update global system configuration
 * @route   PATCH /api/system/config
 * @access  Private (SuperAdmin)
 */
export const updateSystemConfig = async (req, res, next) => {
  try {
    const config = await GlobalConfig.findOneAndUpdate(
      {},
      { ...req.body, lastUpdatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};
