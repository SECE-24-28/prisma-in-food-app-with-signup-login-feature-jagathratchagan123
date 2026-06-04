import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { protect, adminOnly, AuthRequest } from "../middleware/auth";

const router = Router();

const foodSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  available: z.boolean().optional(),
});

// GET /food
router.get("/", async (_req, res: Response) => {
  const items = await prisma.foodItem.findMany({ where: { available: true } });
  res.json(items);
});

// GET /food/category/:cat
router.get("/category/:cat", async (req, res: Response) => {
  const items = await prisma.foodItem.findMany({
    where: { category: req.params.cat, available: true },
  });
  res.json(items);
});

// GET /food/:id
router.get("/:id", async (req, res: Response) => {
  const item = await prisma.foodItem.findUnique({ where: { id: +req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

// POST /food  (admin)
router.post("/", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const parsed = foodSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await prisma.foodItem.create({ data: parsed.data });
  res.status(201).json(item);
});

// PUT /food/:id  (admin)
router.put("/:id", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const parsed = foodSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await prisma.foodItem.update({ where: { id: +req.params.id }, data: parsed.data });
  res.json(item);
});

// DELETE /food/:id  (admin)
router.delete("/:id", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  await prisma.foodItem.delete({ where: { id: +req.params.id } });
  res.json({ message: "Deleted" });
});

export default router;
