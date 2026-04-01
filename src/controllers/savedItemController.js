import SavedItem from "../models/SavedItem.js";

// @desc    Toggle Save/Unsave an item
// @route   POST /api/saved-items/toggle
// @access  Private
export const toggleSave = async (req, res, next) => {
    try {
        const { itemId, itemType } = req.body;
        const user = req.user.id;

        if (!itemId || !itemType) {
            return res.status(400).json({ message: "ItemID and ItemType are required" });
        }

        // Check if item is already saved
        const existingSave = await SavedItem.findOne({ user, itemId });

        if (existingSave) {
            // Unsave
            await SavedItem.findByIdAndDelete(existingSave._id);
            return res.status(200).json({ saved: false, message: "Removed from saved items" });
        } else {
            // Save
            await SavedItem.create({ user, itemId, itemType });
            return res.status(201).json({ saved: true, message: "Added to saved items" });
        }
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Already saved" });
        }
        next(error);
    }
};

// @desc    Get user's saved items
// @route   GET /api/saved-items
// @access  Private
export const getMySavedItems = async (req, res, next) => {
    try {
        const { type } = req.query; // Optional filter by Event or Post
        const query = { user: req.user.id };
        if (type) query.itemType = type;

        const savedItems = await SavedItem.find(query)
            .populate({
                path: "itemId",
                populate: { path: "club", select: "name logo" }
            })
            .sort("-createdAt");

        res.status(200).json(savedItems);
    } catch (error) {
        next(error);
    }
};

// @desc    Check if an item is saved by user
// @route   GET /api/saved-items/check/:itemId
// @access  Private
export const checkIsSaved = async (req, res, next) => {
    try {
        const isSaved = await SavedItem.exists({ 
            user: req.user.id, 
            itemId: req.params.itemId 
        });
        res.status(200).json({ saved: !!isSaved });
    } catch (error) {
        next(error);
    }
};
