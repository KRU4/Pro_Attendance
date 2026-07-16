import { PrismaClient, EmployeeType, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hashToken, generateToken } from "../src/lib/api-token";

const prisma = new PrismaClient();

async function main() {
  await prisma.appSetting.upsert({
    where: { key: "APP_TIMEZONE" },
    update: {},
    create: { key: "APP_TIMEZONE", value: "Africa/Cairo" },
  });
  await prisma.appSetting.upsert({
    where: { key: "APP_TIME_FORMAT" },
    update: {},
    create: { key: "APP_TIME_FORMAT", value: "24h" },
  });

  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@progroup.eg" },
    update: {},
    create: {
      email: "admin@progroup.eg",
      password_hash: passwordHash,
      name: "مدير الحسابات",
      role: "ADMIN",
    },
  });

  const token = generateToken();
  const existingToken = await prisma.apiToken.findFirst({
    where: { is_active: true },
  });
  if (!existingToken) {
    await prisma.apiToken.create({
      data: { token_hash: hashToken(token), label: "n8n development" },
    });
    console.log("API Token (save this):", token);
  }

  const employees = [
    {
      employee_code: 1001,
      name: "أحمد محمود",
      phone: "+201001234567",
      type: EmployeeType.OFFICE,
      allow_checkout_input: false,
      default_checkout_time: "18:00",
      weeklyOffs: [5, 6],
    },
    {
      employee_code: 1002,
      name: "محمد علي",
      phone: "+201112223344",
      type: EmployeeType.FIELD,
      allow_checkout_input: true,
      required_days_per_month: 22,
      required_hours_per_month: 176,
      weeklyOffs: [5, 6],
    },
    {
      employee_code: 1003,
      name: "سارة حسن",
      phone: "+201223334455",
      type: EmployeeType.OFFICE,
      allow_checkout_input: false,
      default_checkout_time: "17:30",
      weeklyOffs: [5, 6],
    },
    {
      employee_code: 1004,
      name: "خالد إبراهيم",
      phone: "+201334445566",
      type: EmployeeType.FIELD,
      allow_checkout_input: true,
      required_days_per_month: 20,
      required_hours_per_month: 160,
      weeklyOffs: [5, 6],
    },
  ];

  for (const emp of employees) {
    const { weeklyOffs, ...data } = emp;
    const employee = await prisma.employee.upsert({
      where: { employee_code: emp.employee_code },
      update: {},
      create: data,
    });
    for (const dow of weeklyOffs) {
      await prisma.employeeWeeklyOff.upsert({
        where: {
          employee_id_day_of_week: {
            employee_id: employee.id,
            day_of_week: dow,
          },
        },
        update: {},
        create: { employee_id: employee.id, day_of_week: dow },
      });
    }
  }

  await prisma.companyHoliday.upsert({
    where: { id: 1 },
    update: {},
    create: {
      date: new Date("2026-07-23"),
      label: "عيد الأضحى",
    },
  });

  const allEmployees = await prisma.employee.findMany();
  const year = 2026;
  const month = 7;

  for (const emp of allEmployees) {
    for (let day = 1; day <= 12; day++) {
      const date = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`);
      const dow = date.getUTCDay();
      if (dow === 5 || dow === 6) continue;

      if (day === 10 && emp.employee_code === 1002) {
        await prisma.attendanceRecord.upsert({
          where: {
            employee_id_date: { employee_id: emp.id, date },
          },
          update: {},
          create: {
            employee_id: emp.id,
            date,
            status: AttendanceStatus.INCOMPLETE,
            check_in_time: new Date(`2026-07-10T06:00:00.000Z`),
            check_in_location: "فرع مدينتي",
          },
        });
        continue;
      }

      if (day === 8) continue;

      const checkIn = new Date(`2026-07-${String(day).padStart(2, "0")}T06:00:00.000Z`);
      const checkOut =
        emp.type === EmployeeType.FIELD
          ? new Date(`2026-07-${String(day).padStart(2, "0")}T15:00:00.000Z`)
          : null;

      await prisma.attendanceRecord.upsert({
        where: {
          employee_id_date: { employee_id: emp.id, date },
        },
        update: {},
        create: {
          employee_id: emp.id,
          date,
          status: AttendanceStatus.PRESENT,
          check_in_time: checkIn,
          check_out_time: checkOut,
          check_in_location: emp.type === EmployeeType.FIELD ? "موقع العمل" : "المكتب الرئيسي",
          check_out_location: checkOut ? "موقع العمل" : null,
        },
      });
    }
  }

  console.log("Seed completed.");
  console.log("Login: admin@progroup.eg / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
