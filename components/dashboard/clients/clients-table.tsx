"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TypographyP, TypographyMuted } from "@/components/ui/typography";
import { Search, MoreVertical, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ClientWithStats } from "@/types";
import { getClientsAction, deleteClientAction } from "@/app/actions/clients";
import { formatDate } from "@/lib/utils";

export function ClientsTable() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithStats[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.description?.toLowerCase().includes(query)
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  async function loadClients() {
    try {
      setLoading(true);
      const data = await getClientsAction();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Are you sure you want to delete the client "${name}"? This will remove all associated users.`
      )
    ) {
      return;
    }

    const result = await deleteClientAction(id);
    if (result.success) {
      toast.success(`Client "${name}" deleted successfully`);
      loadClients();
    } else {
      toast.error(`Failed to delete client: ${result.error}`);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <Card className="card-padding">
      <div className="space-y-5">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            type="search"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 text-body-sm transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
        </div>

        {/* Table */}
        {filteredClients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-body-sm text-muted-foreground">
              {searchQuery ? "No clients found" : "No clients yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Table header */}
            <div className="hidden items-center gap-4 border-b pb-3 md:flex">
              <TypographyMuted className="w-[200px] flex-1">
                Name
              </TypographyMuted>
              <TypographyMuted className="w-[100px]">Users</TypographyMuted>
              <TypographyMuted className="w-[80px]">Status</TypographyMuted>
              <TypographyMuted className="w-[100px]">Created</TypographyMuted>
              <div className="w-[60px]"></div>
            </div>

            {/* Table rows */}
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="card-interactive flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4"
              >
                <div className="w-full flex-1 md:w-[200px]">
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="link-primary inline-block font-medium"
                  >
                    {client.name}
                  </Link>
                  {client.description && (
                    <p className="text-caption mt-1 md:hidden">
                      {client.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 md:contents">
                  <div className="w-[100px]">
                    <p className="text-body-sm text-muted-foreground">
                      {client.user_count} user{client.user_count !== 1 && "s"}
                    </p>
                  </div>

                  <div className="w-[80px]">
                    <Badge
                      variant={client.is_active ? "default" : "secondary"}
                      className="font-medium"
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="hidden w-[100px] md:block">
                    <p className="text-body-sm text-muted-foreground">
                      {formatDate(client.created_at)}
                    </p>
                  </div>

                  <div className="ml-auto w-[60px]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="flex cursor-pointer items-center"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(client.id, client.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

