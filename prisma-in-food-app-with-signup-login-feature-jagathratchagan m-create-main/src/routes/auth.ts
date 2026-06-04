import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../lib/prisma";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt";
import { JwtPayload } from "jsonwebtoken";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { name, email, password, phone, address } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, phone, address },
    select: { id: true, name: true, email: true, role: true },
  });

  const accessToken = signAccess({ id: user.id, role: user.role });
  const refreshToken = signRefresh({ id: user.id });
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.status(201).json({ user, accessToken });
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  const accessToken = signAccess({ id: user.id, role: user.role });
  const refreshToken = signRefresh({ id: user.id });
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken });
});

// POST /auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });
  try {
    const payload = verifyRefresh(token) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.refreshToken !== token)
      return res.status(403).json({ message: "Refresh token mismatch" });
    const accessToken = signAccess({ id: user.id, role: user.role });
    res.json({ accessToken });
  } catch {
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

// POST /auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const payload = verifyRefresh(token) as JwtPayload;
    await prisma.user.update({ where: { id: payload.id }, data: { refreshToken: null } });
  }
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
});

export default router;
