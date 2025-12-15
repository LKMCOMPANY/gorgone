import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Report | GORGONE",
  description: "View shared intelligence report",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SharedReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {children}
    </div>
  );
}

