import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { protect, adminOnly, AuthRequest } from "../middleware/auth";

const router = Router();

const orderSchema = z.object({
  items: z.array(
    z.object({ foodItemId: z.number(), quantity: z.number().min(1) })
  ).min(1),
});

// POST /orders
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const foodIds = parsed.data.items.map((i) => i.foodItemId);
  const foods = await prisma.foodItem.findMany({ where: { id: { in: foodIds } } });
  if (foods.length !== foodIds.length)
    return res.status(400).json({ message: "One or more food items not found" });

  const totalPrice = parsed.data.items.reduce((sum, i) => {
    const food = foods.find((f) => f.id === i.foodItemId)!;
    return sum + food.price * i.quantity;
  }, 0);

  const order = await prisma.order.create({
    data: {
      userId: req.user!.id,
      totalPrice,
      items: {
        create: parsed.data.items.map((i) => {
          const food = foods.find((f) => f.id === i.foodItemId)!;
          return { foodItemId: i.foodItemId, quantity: i.quantity, price: food.price };
        }),
      },
    },
    include: { items: { include: { foodItem: true } } },
  });
  res.status(201).json(order);
});

// GET /orders/my
router.get("/my", protect, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: { items: { include: { foodItem: true } }, payment: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

// GET /orders  (admin)
router.get("/", protect, adminOnly, async (_req, res: Response) => {
  const orders = await prisma.order.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, items: true, payment: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

// PATCH /orders/:id/status  (admin)
router.patch("/:id/status", protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const order = await prisma.order.update({
    where: { id: +req.params.id },
    data: { status },
  });
  res.json(order);
});

export default router;
