import Event from "../models/event.js";
import Sponsorship from "../models/Sponsorship.js";
import Expense from "../models/Expense.js";
import Club from "../models/club.js";

// Helper to check if user has access to event finance
const checkFinanceAccess = async (user, eventId) => {
    if (user.role === "admin" || user.role === "superAdmin") return true;
    
    if (user.role === "club_admin") {
        const event = await Event.findById(eventId);
        if (!event) return false;
        
        const club = await Club.findOne({ admin: user._id });
        if (!club) return false;
        
        return event.club.toString() === club._id.toString();
    }
    
    return false;
};

// @desc    Get financial summary for an event
// @route   GET /api/finance/:eventId/summary
// @access  Private
export const getEventFinanceSummary = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized to access financial data for this event" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Calculate sponsorship income (excluding Inactive)
        const sponsors = await Sponsorship.find({ 
            event: eventId,
            status: { $ne: "Inactive" }
        });
        const totalSponsorships = sponsors.reduce((acc, curr) => acc + curr.amount, 0);

        // Calculate expenses
        const expenses = await Expense.find({ event: eventId });
        const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        // Calculate ticket sales income (registrations * ticketPrice)
        const ticketIncome = (event.registrations || 0) * (event.ticketPrice || 0);

        const totalIncome = totalSponsorships + ticketIncome;
        const netProfit = totalIncome - totalExpenses;
        const remainingBudget = (event.budget || 0) - totalExpenses;

        res.status(200).json({
            budget: event.budget || 0,
            ticketPrice: event.ticketPrice || 0,
            totalSponsorships,
            ticketIncome,
            totalIncome,
            totalExpenses,
            netProfit,
            remainingBudget,
            registrations: event.registrations || 0
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get sponsors for an event
// @route   GET /api/finance/:eventId/sponsors
// @access  Private
export const getSponsors = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized to access financial data for this event" });
        }

        const sponsors = await Sponsorship.find({ event: eventId }).sort({ createdAt: -1 });
        res.status(200).json(sponsors);
    } catch (error) {
        next(error);
    }
};

// @desc    Add a sponsor to an event
// @route   POST /api/finance/:eventId/sponsors
// @access  Private
export const addSponsor = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized to manage financial data for this event" });
        }

        const { name, tier, amount, contactEmail, contactPhone, status } = req.body;
        const sponsor = await Sponsorship.create({
            event: eventId,
            name,
            tier,
            amount,
            contactEmail,
            contactPhone,
            status: status || "Active"
        });
        res.status(201).json(sponsor);
    } catch (error) {
        next(error);
    }
};

// @desc    Update a sponsor
// @route   PUT /api/finance/:eventId/sponsors/:sponsorId
// @access  Private
export const updateSponsor = async (req, res, next) => {
    try {
        const { eventId, sponsorId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const sponsor = await Sponsorship.findOneAndUpdate(
            { _id: sponsorId, event: eventId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!sponsor) return res.status(404).json({ message: "Sponsor not found" });
        res.status(200).json(sponsor);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a sponsor
// @route   DELETE /api/finance/:eventId/sponsors/:sponsorId
// @access  Private
export const deleteSponsor = async (req, res, next) => {
    try {
        const { eventId, sponsorId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const sponsor = await Sponsorship.findOneAndDelete({ _id: sponsorId, event: eventId });
        if (!sponsor) return res.status(404).json({ message: "Sponsor not found" });
        res.status(200).json({ message: "Sponsor deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// @desc    Get expenses for an event
// @route   GET /api/finance/:eventId/expenses
// @access  Private
export const getExpenses = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized to access financial data for this event" });
        }

        const expenses = await Expense.find({ event: eventId }).sort({ date: -1 });
        res.status(200).json(expenses);
    } catch (error) {
        next(error);
    }
};

// @desc    Add an expense to an event
// @route   POST /api/finance/:eventId/expenses
// @access  Private
export const addExpense = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized to manage financial data for this event" });
        }

        const { title, description, amount, date, category, status } = req.body;
        const expense = await Expense.create({
            event: eventId,
            title,
            description,
            amount,
            date: date || Date.now(),
            category,
            status: status || "Pending",
            addedBy: req.user._id
        });
        res.status(201).json(expense);
    } catch (error) {
        next(error);
    }
};

// @desc    Update event budget and ticketPrice
// @route   PUT /api/finance/:eventId/config
// @access  Private
export const updateEventFinanceConfig = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        if (!(await checkFinanceAccess(req.user, eventId))) {
            return res.status(403).json({ message: "Not authorized to manage financial data for this event" });
        }

        const { budget, ticketPrice } = req.body;
        const event = await Event.findByIdAndUpdate(
            eventId,
            { budget, ticketPrice },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Finance configuration updated", budget: event.budget, ticketPrice: event.ticketPrice });
    } catch (error) {
        next(error);
    }
};

