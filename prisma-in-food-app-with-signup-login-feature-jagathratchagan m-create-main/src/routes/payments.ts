import { Router, Response, Request } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma";
import { protect, AuthRequest } from "../middleware/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const router = Router();

// POST /payments/checkout/:orderId
router.post("/checkout/:orderId", protect, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: +req.params.orderId },
    include: { items: { include: { foodItem: true } } },
  });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.userId !== req.user!.id)
    return res.status(403).json({ message: "Not your order" });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: order.items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.foodItem.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    metadata: { orderId: String(order.id) },
  });

  res.json({ url: session.url, sessionId: session.id });
});

// POST /payments/webhook  (Stripe webhook)
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.orderId);

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId,
          stripePaymentId: session.payment_intent as string,
          amount: (session.amount_total ?? 0) / 100,
          status: "SUCCESS",
        },
      }),
      prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } }),
    ]);
  }

  res.json({ received: true });
});

// GET /payments/my
router.get("/my", protect, async (req: AuthRequest, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { order: { userId: req.user!.id } },
    include: { order: { include: { items: { include: { foodItem: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(payments);
});

export default router;
