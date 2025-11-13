import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardFooter } from "@/components/dashboard/footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col w-full">
          <DashboardHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          <DashboardFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

