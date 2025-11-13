import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TypographyH1, TypographyMuted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClientDetails } from "@/components/dashboard/clients/client-details";
import { ClientDetailsSkeleton } from "@/components/dashboard/clients/client-details-skeleton";
import { getClientWithStatsAction } from "@/app/actions/clients";

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
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
        <TypographyH1>{client.name}</TypographyH1>
        <TypographyMuted>
          {client.description || "No description provided"}
        </TypographyMuted>
      </div>

      <Suspense fallback={<ClientDetailsSkeleton />}>
        <ClientDetails clientId={id} initialClient={client} />
      </Suspense>
    </div>
  );
}

