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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Clients</h2>
        <Button variant="outline" size="sm" asChild className="h-8">
          <Link href="/dashboard/clients" className="gap-2">
            View All
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Clients grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clients.map((client) => (
          <Card 
            key={client.id}
            className="group relative hover:shadow-md transition-all duration-200 overflow-hidden border-muted-foreground/20"
          >
            <CardContent className="p-5">
              <div className="space-y-4">
                {/* Client info */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex items-center justify-center size-10 rounded-md bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate leading-none mb-1.5">{client.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium gap-1">
                        <Users className="size-3" />
                        {client.user_count}
                      </Badge>
                      {client.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={client.description}>
                          {client.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <Button
                  onClick={() => handleViewAsClient(client.id, client.name)}
                  disabled={impersonating === client.id}
                  className="w-full h-9"
                  size="sm"
                  variant="secondary"
                >
                  {impersonating === client.id ? (
                    'Switching...'
                  ) : (
                    <>
                      <UserCog className="size-3.5 mr-2" />
                      Access Dashboard
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

