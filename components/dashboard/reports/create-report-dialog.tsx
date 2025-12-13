"use client";

import * as React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createReportAction } from "@/app/actions/reports";
import type { Zone } from "@/types";

interface CreateReportDialogProps {
  zones: Zone[];
}

export function CreateReportDialog({ zones }: CreateReportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [selectedZone, setSelectedZone] = React.useState<string>(
    zones[0]?.id || ""
  );
  const [title, setTitle] = React.useState("");

  const handleCreate = async () => {
    if (!selectedZone) {
      toast.error("Please select a zone");
      return;
    }

    setIsCreating(true);
    const result = await createReportAction(selectedZone, title || undefined);
    setIsCreating(false);

    if (result.success && result.report) {
      setOpen(false);
      setTitle("");
      toast.success("Report created");
      router.push(`/dashboard/reports/${result.report.id}`);
    } else {
      toast.error(result.error || "Failed to create report");
    }
  };

  if (zones.length === 0) {
    return (
      <Button disabled>
        <Plus className="size-4 mr-2" />
        New Report
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          New Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogDescription>
            Start a new intelligence report for a monitoring zone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="zone">Zone</Label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger id="zone">
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Intelligence Report - DD/MM/YYYY"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for automatic date-based title.
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
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

