"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Crosshair, 
  ShieldAlert, 
  Users, 
  Activity 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { AttilaOperation, AttilaOperationType } from "@/types";
import { toggleOperationStatusAction, deleteOperationAction } from "@/app/actions/attila";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OperationCardProps {
  operation: AttilaOperation;
  zoneId: string;
}

const TypeIcon = ({ type }: { type: AttilaOperationType }) => {
  switch (type) {
    case "sniper":
      return <Crosshair className="size-4" />;
    case "sentinel":
      return <ShieldAlert className="size-4" />;
    case "influence":
      return <Users className="size-4" />;
    default:
      return <Activity className="size-4" />;
  }
};

const TypeBadge = ({ type }: { type: AttilaOperationType }) => {
  const colors = {
    sniper: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20",
    sentinel: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20",
    influence: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1.5 capitalize", colors[type])}
    >
      <TypeIcon type={type} />
      {type}
    </Badge>
  );
};

export function OperationCard({ operation, zoneId }: OperationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(operation.status);

  const handleToggleStatus = async () => {
    setIsLoading(true);
    const newStatus = status === "active" ? "paused" : "active";
    
    try {
      const result = await toggleOperationStatusAction(zoneId, operation.id, newStatus);
      if (result.success) {
        setStatus(newStatus);
        toast.success(`Operation ${newStatus === "active" ? "started" : "paused"}`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this operation?")) return;
    
    setIsLoading(true);
    try {
      const result = await deleteOperationAction(zoneId, operation.id);
      if (result.success) {
        toast.success("Operation deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete");
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const isActive = status === "active";

  return (
    <Card className="group relative overflow-hidden border-border transition-all duration-300 hover:shadow-md">
      {isActive && (
        <div className="absolute top-0 left-0 h-1 w-full bg-primary animate-pulse" />
      )}
      
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold truncate pr-4">
              {operation.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Created {new Date(operation.created_at).toLocaleDateString()}
            </p>
          </div>
          <TypeBadge type={operation.type} />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={cn("size-2 rounded-full", isActive ? "bg-green-500" : "bg-slate-500")} />
          <span className="capitalize">{status}</span>
        </div>
      </div>

      <div className="bg-muted/20 p-3 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-primary"
                  asChild
                >
                  <Link href={`/dashboard/zones/${zoneId}/attila/${operation.id}`}>
                    <Edit className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Configuration</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleStatus}
                  disabled={isLoading}
                  className={cn(
                    "size-8", 
                    isActive 
                      ? "text-orange-500 hover:text-orange-600 hover:bg-orange-500/10" 
                      : "text-green-500 hover:text-green-600 hover:bg-green-500/10"
                  )}
                >
                  {isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isActive ? "Pause Operation" : "Start Operation"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Operation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}

