import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.use(
    cors({
        origin: process.env.CLIENT_URL?.split(",") || "*",
        credentials: true,
    })
);

app.use("/api", routes);
app.use(errorHandler);

export default app;
