import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ClientsTable } from "@/components/dashboard/clients/clients-table";
import { ClientsTableSkeleton } from "@/components/dashboard/clients/clients-table-skeleton";

export default function ClientsPage() {
  return (
    <div className="animate-in space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Clients
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage client operations and their users
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            New Client
          </Button>
        </Link>
      </div>

      {/* Clients Table */}
      <Suspense fallback={<ClientsTableSkeleton />}>
        <ClientsTable />
      </Suspense>
    </div>
  );
}

