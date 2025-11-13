import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { CreateClientForm } from "@/components/dashboard/clients/create-client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  return (
    <div className="animate-in" style={{ animationDelay: "50ms" }}>
      <Link href="/dashboard/clients">
        <Button variant="ghost" size="sm" className="-ml-2 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </Link>
      
      <div className="mb-8 space-y-1.5">
        <h1 className="text-heading-1">Create New Client</h1>
        <p className="text-body-sm text-muted-foreground">
          Create a new client operation and configure its users
        </p>
      </div>

      <CreateClientForm />
    </div>
  );
}

