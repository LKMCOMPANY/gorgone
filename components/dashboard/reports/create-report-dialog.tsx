"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Loader2, MapPin } from "lucide-react";
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
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Create New Report
          </DialogTitle>
          <DialogDescription>
            Start a new intelligence report for a monitoring zone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="zone" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="size-3.5 text-muted-foreground" />
              Zone
            </Label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger id="zone" className="h-10">
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
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Intelligence Report - DD/MM/YYYY"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for automatic date-based title.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
            className="h-10"
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="h-10">
            {isCreating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Create Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

