import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: [true, "Expense must belong to an event"],
        },
        title: {
            type: String,
            required: [true, "Expense title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, "Expense amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        date: {
            type: Date,
            default: Date.now,
        },
        category: {
            type: String,
            required: [true, "Expense category is required"],
            enum: ["Logistics", "Equipment", "Production", "Food & Beverage", "Marketing", "Other"],
            default: "Other",
        },
        status: {
            type: String,
            enum: ["Pending", "Disbursed"],
            default: "Pending",
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Expense must be attributed to a user"],
        },
    },
    {
        timestamps: true,
    }
);

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
