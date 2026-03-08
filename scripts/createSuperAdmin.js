import { setServers, setDefaultResultOrder } from "dns";

// Force Node.js to use Google DNS (8.8.8.8) for SRV record resolution.
setDefaultResultOrder("ipv4first");
setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/user.js";
import connectDB from "../src/config/db.js";

dotenv.config();

const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
    if (arg.startsWith("--")) {
        const [key, value] = arg.slice(2).split("=");
        params[key] = value;
    }
});

const { name, email, password } = params;

if (!name || !email || !password) {
    console.error("Usage: node scripts/createSuperAdmin.js --name=\"Name\" --email=\"email@example.com\" --password=\"password\"");
    process.exit(1);
}

const createSuperAdmin = async () => {
    try {
        await connectDB();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.error(`User with email ${email} already exists.`);
            process.exit(1);
        }

        const user = new User({
            name,
            email,
            password,
            role: "superAdmin"
        });

        await user.save();
        console.log(`SuperAdmin user created successfully: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error("Error creating SuperAdmin:", error);
        process.exit(1);
    }
};

createSuperAdmin();
