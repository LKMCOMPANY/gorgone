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
import { createClientUserAction } from "@/app/actions/clients";
import type { UserRole } from "@/types";

interface CreateUserDialogProps {
  clientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateUserDialog({
  clientId,
  onSuccess,
  onCancel,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [organization, setOrganization] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createClientUserAction(
        clientId,
        email.trim(),
        password,
        role,
        organization.trim() || undefined
      );

      if (result.success) {
        toast.success(`User "${email}" created successfully`);
        onSuccess();
      } else {
        setError(result.error || "Failed to create user");
        toast.error(result.error || "Failed to create user");
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
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Password <span className="text-destructive">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          minLength={6}
        />
        <TypographyMuted className="text-sm">
          Minimum 6 characters
        </TypographyMuted>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
          <SelectTrigger id="role" disabled={loading}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <TypographyMuted className="text-sm">
          Manager and Operator can view data, Admin has view-only access to all clients
        </TypographyMuted>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organization">Organization</Label>
        <Input
          id="organization"
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
          disabled={loading || !email.trim() || !password.trim()}
          className="w-full sm:w-auto"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create User
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

