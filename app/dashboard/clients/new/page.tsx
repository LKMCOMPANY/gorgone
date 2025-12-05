import { CreateClientForm } from "@/components/dashboard/clients/create-client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  return (
    <div className="animate-in space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/clients">
        <Button variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft className="mr-2 size-4" />
          Back to Clients
        </Button>
      </Link>
      
      {/* Page Header */}
      <div className="space-y-1.5">
        <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight">
          Create New Client
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new client operation and configure its users
        </p>
      </div>

      {/* Form */}
      <CreateClientForm />
    </div>
  );
}

