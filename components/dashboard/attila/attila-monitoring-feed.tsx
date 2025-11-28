"use client";

import { AttilaThread } from "@/lib/data/attila";
import { TwitterFeedCard } from "@/components/dashboard/zones/twitter/twitter-feed-card";
import { ArrowRight, MessageSquare, CornerDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AttilaMonitoringFeedProps {
  activity: AttilaThread[];
  zoneId: string;
}

export function AttilaMonitoringFeed({ activity, zoneId }: AttilaMonitoringFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-xl bg-muted/5">
        <div className="rounded-full bg-muted/30 p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-heading-3 mb-2">No Activity Recorded</h3>
        <p className="text-body text-muted-foreground max-w-md mx-auto">
          Once your Attila avatars start responding to posts, the conversations will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {activity.map((thread, index) => (
        <div key={index} className="relative group">
          
          {/* Thread Container */}
          <div className="flex flex-col gap-6">
            
            {/* Target Tweet Section */}
            <div className="relative z-10">
              {thread.target ? (
                <div className="relative">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider bg-muted/30 px-2 py-0.5 rounded">Target</span>
                  </div>
                  {/* Hover effect to highlight connection */}
                  <div className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    <TwitterFeedCard tweet={thread.target} zoneId={zoneId} />
                  </div>
                </div>
              ) : (
                <Card className="p-6 flex flex-col items-center justify-center bg-muted/10 border-dashed border-2">
                  <p className="text-sm font-medium text-muted-foreground">Original Context Unavailable</p>
                  <p className="text-xs text-muted-foreground/70">The target tweet could not be retrieved</p>
                </Card>
              )}
            </div>

            {/* Responses Section */}
            <div className="relative pl-4 lg:pl-12 space-y-4">
              {/* Connector Line (Desktop) */}
              <div className="absolute left-0 top-[-24px] bottom-4 w-0.5 bg-gradient-to-b from-border via-border to-transparent hidden lg:block" />
              
              {thread.responses.map((response, rIndex) => (
                <div key={response.id} className="relative">
                  {/* Curved Connector (Desktop) */}
                  <div className="absolute left-[-48px] top-8 w-8 h-8 border-b-2 border-l-2 border-border rounded-bl-2xl hidden lg:block" />
                  
                  {/* Connector Icon (Mobile) */}
                  <div className="absolute left-[-24px] top-1 text-muted-foreground lg:hidden">
                    <CornerDownRight className="h-4 w-4" />
                  </div>

                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                      Attila Response {thread.responses.length > 1 ? `#${rIndex + 1}` : ""}
                    </span>
                  </div>
                  
                  <div className={cn(
                    "relative overflow-hidden rounded-xl border bg-card transition-all duration-200",
                    "hover:shadow-md hover:border-primary/30",
                    // Subtle highlight for the response
                    "after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary"
                  )}>
                    <TwitterFeedCard tweet={response} zoneId={zoneId} />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}
