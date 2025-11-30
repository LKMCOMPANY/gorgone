"use client";

import { useState } from "react";
import { AttilaOperation } from "@/types";
import { OperationCard } from "./operation-card";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AttilaOperationsListProps {
  zoneId: string;
  initialOperations: AttilaOperation[];
}

export function AttilaOperationsList({
  zoneId,
  initialOperations,
}: AttilaOperationsListProps) {
  const [operations, setOperations] = useState<AttilaOperation[]>(initialOperations);

  // Handlers will be passed to cards to update local state optimistically
  // or trigger refreshes

  if (operations.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
        <div className="rounded-full bg-muted/30 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-heading-3 mb-2">No Operations Yet</h3>
        <p className="text-body text-muted-foreground max-w-md">
          Create your first Attila automation operation to start monitoring and responding to events in this zone.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {operations.map((op) => (
        <OperationCard key={op.id} operation={op} zoneId={zoneId} />
      ))}
    </div>
  );
}

