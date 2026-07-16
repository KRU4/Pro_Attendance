import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pro Group Attendance",
  description: "WhatsApp-based attendance tracking dashboard",
};

const fontBody = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-body",
  display: "swap",
});

const fontHeading = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-heading",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${fontBody.variable} ${fontHeading.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
