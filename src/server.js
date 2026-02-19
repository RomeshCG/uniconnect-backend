import { setServers, setDefaultResultOrder } from "dns";

// Force Node.js to use Google DNS (8.8.8.8) for SRV record resolution.
// The local router DNS often rejects SRV queries, causing querySrv ECONNREFUSED
// when using the mongodb+srv:// scheme. This must run before any imports that
// trigger DNS lookups.
setDefaultResultOrder("ipv4first");
setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
