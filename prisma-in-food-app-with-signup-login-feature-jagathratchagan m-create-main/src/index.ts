import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import foodRoutes from "./routes/food";
import orderRoutes from "./routes/orders";
import paymentRoutes from "./routes/payments";
import userRoutes from "./routes/users";

const app = express();

// Stripe webhook needs raw body
app.use("/payments/webhook", express.raw({ type: "application/json" }));

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/food", foodRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/users", userRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🍕 Food App running on port ${PORT}`));
