"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, UserCog, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import type { ClientWithStats } from "@/types";
import { getClientsAction } from "@/app/actions/clients";
import { impersonateClientAction } from "@/app/actions/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientsQuickAccess() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const data = await getClientsAction();
      // Show only active clients, sorted by most recent
      const activeClients = data
        .filter((c) => c.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6); // Max 6 clients
      setClients(activeClients);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewAsClient(id: string, name: string) {
    setImpersonating(id);
    const result = await impersonateClientAction(id);

    if (result.success) {
      toast.success(`Now viewing as ${name}`);
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to switch view");
      setImpersonating(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Clients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No active clients yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5" />
          Clients
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/clients" className="gap-1">
            View All
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{client.name}</h3>
                <Badge variant="outline" className="shrink-0 text-xs">
                  <Users className="size-3 mr-1" />
                  {client.user_count}
                </Badge>
              </div>
              {client.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {client.description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewAsClient(client.id, client.name)}
              disabled={impersonating === client.id}
              className="ml-3 gap-1.5 shrink-0"
            >
              <UserCog className="size-3.5" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

