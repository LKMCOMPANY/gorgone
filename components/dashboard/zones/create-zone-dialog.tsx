"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZoneAction } from "@/app/actions/zones";
import { toast } from "sonner";

interface CreateZoneDialogProps {
  clientId: string;
}

export function CreateZoneDialog({ clientId }: CreateZoneDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!zoneName.trim()) {
      toast.error("Please enter a zone name");
      return;
    }

    setIsCreating(true);

    try {
      const result = await createZoneAction(zoneName.trim(), clientId);

      if (result.success && result.zone) {
        toast.success("Zone created successfully");
        setOpen(false);
        setZoneName("");
        // Refresh the page to show new zone
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create zone");
      }
    } catch (error) {
      console.error("Error creating zone:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 transition-all duration-[150ms] hover:bg-accent"
        >
          <Plus className="h-4 w-4 transition-transform duration-[150ms] group-hover:scale-110" />
          <span className="text-body-sm">Create Zone</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] gap-0">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-heading-2">Create New Zone</DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            Create a monitoring zone for social media tracking and analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="zone-name" className="text-body-sm font-medium">
              Zone Name
            </Label>
            <Input
              id="zone-name"
              placeholder="e.g., Presidential Campaign, Brand Monitoring"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              className="h-10 transition-all duration-[150ms] focus-visible:shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            <p className="text-caption text-muted-foreground">
              Choose a clear, descriptive name for your monitoring zone
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
            className="transition-all duration-[150ms]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !zoneName.trim()}
            className="min-w-[120px] transition-all duration-[150ms]"
          >
            {isCreating ? "Creating..." : "Create Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

