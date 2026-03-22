import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/public", express.static(path.join(__dirname, "../public")));

app.use(
    cors({
        origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : ["http://localhost:5173"],
        credentials: true,
    })
);

app.use("/api", routes);
app.use(errorHandler);

export default app;
