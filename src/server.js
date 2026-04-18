import { setServers, setDefaultResultOrder } from "dns";

// Force Node.js to use Google DNS (8.8.8.8) for SRV record resolution.
// The local router DNS often rejects SRV queries, causing querySrv ECONNREFUSED
// when using the mongodb+srv:// scheme. This must run before any imports that
// trigger DNS lookups.
setDefaultResultOrder("ipv4first");
setServers(["8.8.8.8", "8.8.4.4"]);

import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { startReminderScheduler } from "./services/reminderScheduler.js";

dotenv.config();

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(server);

await connectDB();
startReminderScheduler();

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server is ready`);
});
