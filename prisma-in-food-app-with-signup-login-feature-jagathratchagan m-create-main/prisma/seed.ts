import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@foodapp.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@foodapp.com",
      password: await bcrypt.hash("Admin@123", 10),
      role: "ADMIN",
    },
  });
  console.log("Admin seeded:", admin.email);

  const foods = [
    { name: "Margherita Pizza", description: "Classic tomato & mozzarella", price: 12.99, category: "Pizza" },
    { name: "Chicken Burger", description: "Crispy chicken with lettuce & mayo", price: 8.99, category: "Burger" },
    { name: "Veg Biryani", description: "Fragrant basmati rice with spiced veggies", price: 10.49, category: "Rice" },
    { name: "Chocolate Lava Cake", description: "Warm cake with molten chocolate centre", price: 5.99, category: "Dessert" },
    { name: "Mango Lassi", description: "Chilled yogurt mango drink", price: 3.49, category: "Drinks" },
  ];

  for (const food of foods) {
    await prisma.foodItem.upsert({
      where: { id: foods.indexOf(food) + 1 },
      update: {},
      create: food,
    });
  }
  console.log("Food items seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
