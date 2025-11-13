"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TypographyP, TypographyMuted } from "@/components/ui/typography";
import { MoreVertical, Mail, Shield, Building, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import type { ClientUser } from "@/types";
import { deleteClientUserAction } from "@/app/actions/clients";
import { EditUserDialog } from "./edit-user-dialog";
import { formatDate } from "@/lib/utils";
import { getRoleName } from "@/lib/auth/permissions";

interface ClientUsersListProps {
  users: ClientUser[];
  onUserUpdated: () => void;
  onUserDeleted: () => void;
}

export function ClientUsersList({
  users,
  onUserUpdated,
  onUserDeleted,
}: ClientUsersListProps) {
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);

  async function handleDeleteUser(user: ClientUser) {
    if (
      !confirm(
        `Are you sure you want to delete the user "${user.email}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const result = await deleteClientUserAction(user.id);
    if (result.success) {
      toast.success(`User "${user.email}" deleted successfully`);
      onUserDeleted();
    } else {
      toast.error(`Failed to delete user: ${result.error}`);
    }
  }

  function handleUserUpdated() {
    setEditingUser(null);
    onUserUpdated();
  }

  if (users.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-body-sm text-muted-foreground">
          No users yet. Add your first user to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
          {users.map((user) => (
            <div
              key={user.id}
              className="card-interactive flex flex-col gap-3 p-4 md:flex-row md:items-center"
            >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user.email.charAt(0).toUpperCase()}
            </div>

            {/* User info */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-body-sm font-medium">{user.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span className="text-caption">{getRoleName(user.role)}</span>
                </div>
                {user.organization && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building className="h-3 w-3" />
                    <span className="text-caption">{user.organization}</span>
                  </div>
                )}
              </div>
              <p className="text-caption">
                Created {formatDate(user.created_at)}
              </p>
            </div>

            {/* Role badge */}
            <Badge variant="secondary" className="font-medium">
              {getRoleName(user.role)}
            </Badge>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteUser(user)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Edit user dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and credentials
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <EditUserDialog
              user={editingUser}
              onSuccess={handleUserUpdated}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

