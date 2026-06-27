import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useListProjects, useListClientCampaigns } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "offers", labelKey: "yourProposals", href: "/client-portal/offers" },
  { key: "projects", labelKey: "yourProjects", href: "/client-portal/projects" },
  { key: "account-statement", labelKey: "accountStatement", href: "/client-portal/account-statement" },
] as const;

export function ClientPortalTabs() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();
  const { data: projects } = useListProjects();
  const { data: clientCampaigns = [] } = useListClientCampaigns();

  const sharedCampaigns = (clientCampaigns as any[]).filter((c: any) => c.shared);
  const hasCampaigns = sharedCampaigns.length > 0;
  const hasProjectProposals = (user as any)?.canViewProposal !== false && (projects ?? []).some((p: any) => p.finalProposedIdea);
  const hasProposals = hasCampaigns || hasProjectProposals;

  const visibleTabs = tabs.filter((t) => t.key !== "offers" || hasProposals);

  return (
    <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border w-fit" role="tablist">
      {visibleTabs.map((tab) => {
        const isActive = location === tab.href;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            role="tab"
            aria-selected={isActive}
          >
            {t(tab.labelKey as any)}
          </Link>
        );
      })}
    </div>
  );
}
