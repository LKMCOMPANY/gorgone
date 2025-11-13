"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  TypographyH2,
  TypographyP,
  TypographyMuted,
} from "@/components/ui/typography";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ClientWithStats, ClientUser } from "@/types";
import {
  updateClientAction,
  getClientUsersAction,
} from "@/app/actions/clients";
import { ClientUsersList } from "./client-users-list";
import { CreateUserDialog } from "./create-user-dialog";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientDetailsProps {
  clientId: string;
  initialClient: ClientWithStats;
}

export function ClientDetails({
  clientId,
  initialClient,
}: ClientDetailsProps) {
  const [client, setClient] = useState(initialClient);
  const [name, setName] = useState(initialClient.name);
  const [description, setDescription] = useState(
    initialClient.description || ""
  );
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [clientId]);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const data = await getClientUsersAction(clientId);
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }

  // Auto-save name
  useEffect(() => {
    if (name === initialClient.name) return;

    const timer = setTimeout(async () => {
      if (name.trim() && name !== client.name) {
        await handleUpdateClient({ name: name.trim() });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [name]);

  // Auto-save description
  useEffect(() => {
    if (description === (initialClient.description || "")) return;

    const timer = setTimeout(async () => {
      if (description !== client.description) {
        await handleUpdateClient({
          description: description.trim() || null,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [description]);

  async function handleUpdateClient(updates: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  }) {
    setLoading(true);
    try {
      const result = await updateClientAction(clientId, updates);
      if (result.success && result.client) {
        setClient({ ...client, ...result.client });
        toast.success("Client updated successfully");
      } else {
        toast.error("Failed to update client");
      }
    } catch (error) {
      console.error("Failed to update client:", error);
      toast.error("Failed to update client");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(checked: boolean) {
    await handleUpdateClient({ is_active: checked });
  }

  function handleUserCreated() {
    setShowCreateUserDialog(false);
    loadUsers();
  }

  return (
    <div className="space-y-6 animate-in" style={{ animationDelay: "50ms" }}>
      {/* Client Information */}
      <Card className="card-padding">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-2">Client Information</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client name"
                className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 transition-colors duration-[150ms] hover:bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-body-sm font-medium">Active Status</Label>
                <p className="text-caption">
                  Inactive clients cannot be accessed by their users
                </p>
              </div>
              <Switch
                checked={client.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-caption">Created</p>
                <p className="text-body-sm font-medium">{formatDate(client.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-caption">Last Updated</p>
                <p className="text-body-sm font-medium">{formatDate(client.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Users Management */}
      <Card className="card-padding">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-heading-2">Users</h2>
              <p className="text-body-sm text-muted-foreground">
                {users.length} user{users.length !== 1 && "s"}
              </p>
            </div>
            <Dialog
              open={showCreateUserDialog}
              onOpenChange={setShowCreateUserDialog}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to this client operation
                  </DialogDescription>
                </DialogHeader>
                <CreateUserDialog
                  clientId={clientId}
                  onSuccess={handleUserCreated}
                  onCancel={() => setShowCreateUserDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {loadingUsers ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <ClientUsersList
              users={users}
              onUserUpdated={loadUsers}
              onUserDeleted={loadUsers}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

