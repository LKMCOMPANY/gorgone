"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypographyMuted } from "@/components/ui/typography";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateClientUserAction } from "@/app/actions/clients";
import type { ClientUser, UserRole } from "@/types";

interface EditUserDialogProps {
  user: ClientUser;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditUserDialog({
  user,
  onSuccess,
  onCancel,
}: EditUserDialogProps) {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user.role);
  const [organization, setOrganization] = useState(user.organization || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const updates: {
        email?: string;
        role?: UserRole;
        organization?: string | null;
        password?: string;
      } = {};

      if (email !== user.email) updates.email = email.trim();
      if (role !== user.role) updates.role = role;
      if (organization !== (user.organization || "")) {
        updates.organization = organization.trim() || null;
      }
      if (password.trim()) updates.password = password;

      const result = await updateClientUserAction(user.id, updates);

      if (result.success) {
        toast.success("User updated successfully");
        onSuccess();
      } else {
        setError(result.error || "Failed to update user");
        toast.error(result.error || "Failed to update user");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-password">New Password</Label>
        <Input
          id="edit-password"
          type="password"
          placeholder="Leave empty to keep current password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          minLength={6}
        />
        <TypographyMuted className="text-sm">
          Leave empty to keep the current password
        </TypographyMuted>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
          <SelectTrigger id="edit-role" disabled={loading}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-organization">Organization</Label>
        <Input
          id="edit-organization"
          type="text"
          placeholder="Organization name (optional)"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full sm:w-auto"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

