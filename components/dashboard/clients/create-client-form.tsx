"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { toast } from "sonner";
import { createClientAction } from "@/app/actions/clients";
import { Loader2 } from "lucide-react";

export function CreateClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createClientAction(
        name.trim(),
        description.trim() || null
      );

      if (result.success && result.client) {
        toast.success(`Client "${result.client.name}" created successfully`);
        router.push(`/dashboard/clients/${result.client.id}`);
      } else {
        setError(result.error || "Failed to create client");
        toast.error(result.error || "Failed to create client");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="card-padding">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">
            Client Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
            className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
          <p className="text-caption">
            The name of the client operation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            type="text"
            placeholder="Enter description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            className="h-10 transition-shadow duration-[150ms] focus-visible:shadow-[var(--shadow-sm)]"
          />
          <p className="text-caption">
            Optional description of the client operation
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Client
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/clients")}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

