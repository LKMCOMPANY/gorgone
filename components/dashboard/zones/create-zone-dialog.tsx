"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar, SidebarMenuButton } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZoneAction } from "@/app/actions/zones";
import { toast } from "sonner";

interface CreateZoneDialogProps {
  clientId: string;
}

export function CreateZoneDialog({ clientId }: CreateZoneDialogProps) {
  const router = useRouter();
  // const { state } = useSidebar(); // SidebarMenuButton handles state internally
  const [open, setOpen] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // const isCollapsed = state === "collapsed";

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

  const trigger = (
    <SidebarMenuButton tooltip="Create Zone">
      <Plus />
      <span>Create Zone</span>
    </SidebarMenuButton>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Wrap in a span to avoid button nesting if SidebarMenuButton renders a button */}
        <span className="w-full cursor-pointer" tabIndex={-1}>
          {trigger}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Zone</DialogTitle>
          <DialogDescription>
            Create a monitoring zone for social media tracking and analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zone-name">Zone Name</Label>
            <Input
              id="zone-name"
              placeholder="e.g., Presidential Campaign, Brand Monitoring"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Choose a clear, descriptive name for your monitoring zone
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !zoneName.trim()}
            className="min-w-[120px]"
          >
            {isCreating ? "Creating..." : "Create Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

