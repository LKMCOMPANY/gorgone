import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClientDetails } from "@/components/dashboard/clients/client-details";
import { ClientDetailsSkeleton } from "@/components/dashboard/clients/client-details-skeleton";
import { getClientWithStatsAction } from "@/app/actions/clients";
import { PageContainer } from "@/components/dashboard/page-container";

interface ClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const client = await getClientWithStatsAction(id);

  if (!client) {
    notFound();
  }

  return (
    <PageContainer>
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
            {client.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client.description || "No description provided"}
          </p>
        </div>

        {/* Client Details */}
        <Suspense fallback={<ClientDetailsSkeleton />}>
          <ClientDetails clientId={id} initialClient={client} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

