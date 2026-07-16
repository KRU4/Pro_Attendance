import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page-bg">
        <Sidebar />
        <div className="ps-56">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
