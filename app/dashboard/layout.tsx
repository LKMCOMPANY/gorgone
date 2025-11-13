import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardFooter } from "@/components/dashboard/footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar userRole={user.role} />
        <SidebarInset className="flex flex-col w-full">
          <DashboardHeader user={user} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          <DashboardFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
