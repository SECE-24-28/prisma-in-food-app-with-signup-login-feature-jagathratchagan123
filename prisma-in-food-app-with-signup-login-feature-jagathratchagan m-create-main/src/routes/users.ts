import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /users/profile
router.get("/profile", protect, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, phone: true, address: true, role: true, createdAt: true },
  });
  res.json(user);
});

// PATCH /users/profile
router.patch("/profile", protect, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, phone: true, address: true },
  });
  res.json(user);
});

// POST /users/change-password
router.post("/change-password", protect, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password)))
    return res.status(401).json({ message: "Current password is incorrect" });
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  res.json({ message: "Password updated" });
});

export default router;
