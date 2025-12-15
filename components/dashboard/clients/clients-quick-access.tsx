"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, UserCog, Users, Calendar, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      // Show all active clients, sorted by most recent
      const activeClients = data
        .filter((c) => c.is_active)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton 
            key={i} 
            className="h-20 w-full rounded-xl" 
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="py-16 text-center animate-in">
        <div className="inline-flex items-center justify-center size-16 rounded-xl bg-muted/50 border border-border/50 mb-4">
          <Building2 className="size-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No active clients</h3>
        <p className="text-sm text-muted-foreground">
          Create your first client to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clients.map((client, index) => (
        <Card 
          key={client.id}
          className="card-interactive rounded-xl overflow-hidden animate-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="shrink-0 size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="size-6 text-primary" />
              </div>

              {/* Client Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">{client.name}</h3>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium gap-1 shrink-0">
                    <Users className="size-3" />
                    {client.user_count}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {client.description && (
                    <span className="truncate max-w-[200px]" title={client.description}>
                      {client.description}
                    </span>
                  )}
                  <span className="flex items-center gap-1 shrink-0 tabular-nums">
                    <Calendar className="size-3" />
                    {new Date(client.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleViewAsClient(client.id, client.name)}
                disabled={impersonating === client.id}
                className="h-10 px-4 shrink-0 transition-all duration-[var(--transition-fast)]"
                variant="secondary"
              >
                {impersonating === client.id ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <UserCog className="size-4 mr-2" />
                    <span className="hidden sm:inline">Access Dashboard</span>
                    <span className="sm:hidden">Access</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

