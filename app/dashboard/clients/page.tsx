import { Suspense } from "react";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ClientsTable } from "@/components/dashboard/clients/clients-table";
import { ClientsTableSkeleton } from "@/components/dashboard/clients/clients-table-skeleton";

export default function ClientsPage() {
  return (
    <div className="animate-in" style={{ animationDelay: "50ms" }}>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-heading-1">Clients</h1>
          <p className="text-body-sm text-muted-foreground">
            Manage client operations and their users
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </Link>
      </div>

      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsTable />
      </Suspense>
    </div>
  );
}

