import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  console.log("Generated bcryptjs Hash:", passwordHash);

  // استخدام upsert لضمان إنشاء الحساب أو تحديثه إذا كان موجوداً بالفعل
  const admin = await prisma.user.upsert({
    where: { email: "admin@progroup.eg" },
    update: {
      password_hash: passwordHash,
      name: "مدير الحسابات",
      role: "ADMIN"
    },
    create: {
      email: "admin@progroup.eg",
      password_hash: passwordHash,
      name: "مدير الحسابات",
      role: "ADMIN"
    }
  });

  console.log("Admin account successfully synchronized in database:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
