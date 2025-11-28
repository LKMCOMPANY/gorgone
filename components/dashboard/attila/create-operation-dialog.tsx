"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Crosshair, 
  ShieldAlert, 
  Users, 
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createOperationAction } from "@/app/actions/attila";
import { AttilaOperationType } from "@/types";
import { toast } from "sonner";

interface CreateOperationDialogProps {
  zoneId: string;
}

const OPERATION_TYPES: {
  id: AttilaOperationType;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "sniper",
    title: "Sniper Mode",
    description: "Real-time targeted response to posts based on strict criteria.",
    icon: Crosshair,
  },
  {
    id: "sentinel",
    title: "Sentinel Mode",
    description: "Auto-launches based on alerts and volume spikes.",
    icon: ShieldAlert,
  },
  {
    id: "influence",
    title: "Influence Mode",
    description: "Target specific opinion clusters to shift narratives.",
    icon: Users,
  },
];

export function CreateOperationDialog({ zoneId }: CreateOperationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<AttilaOperationType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedType) return;

    setIsLoading(true);
    try {
      // Create with default empty config
      const result = await createOperationAction(
        zoneId,
        name.trim(),
        selectedType,
        {
          context: "",
          guidelines: "",
          language_elements: ""
        }
      );

      if (result.success && result.data) {
        toast.success("Operation created");
        setOpen(false);
        // Redirect to the editor
        router.push(`/dashboard/zones/${zoneId}/attila/${result.data.id}`);
      } else {
        toast.error(result.error || "Failed to create operation");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Operation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Operation</DialogTitle>
            <DialogDescription>
              Select the type of automation you want to deploy.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Operation Name</Label>
              <Input
                id="name"
                placeholder="e.g., Election Counter-Narrative Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <Label>Operation Type</Label>
              <div className="grid gap-4 sm:grid-cols-3">
                {OPERATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <div
                      key={type.id}
                      className={cn(
                        "cursor-pointer rounded-lg border p-4 hover:bg-muted/50 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border"
                      )}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <Icon className={cn("h-6 w-6 mb-3", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <h3 className="font-medium text-sm mb-1">{type.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {type.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !selectedType || isLoading}>
              {isLoading ? "Creating..." : "Create & Configure"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

