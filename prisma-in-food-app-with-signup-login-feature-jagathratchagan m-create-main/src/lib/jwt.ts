import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const signAccess = (payload: object) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });

export const signRefresh = (payload: object) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

export const verifyAccess = (token: string) =>
  jwt.verify(token, ACCESS_SECRET);

export const verifyRefresh = (token: string) =>
  jwt.verify(token, REFRESH_SECRET);
