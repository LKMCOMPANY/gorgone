import { TypographyH1, TypographyMuted } from "@/components/ui/typography";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <TypographyH1>Dashboard</TypographyH1>
        <TypographyMuted>
          Welcome to the social media monitoring platform
        </TypographyMuted>
      </div>
    </div>
  );
}
