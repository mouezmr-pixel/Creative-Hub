import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useListProjects, useListClientCampaigns } from "@workspace/api-client-react";
import { FileText, Briefcase } from "lucide-react";
import { CampaignView } from "./CampaignView";
import { ProjectProposals } from "./ProjectProposals";
import { ProjectCard } from "./ProjectCard";
import { AccountStatementSection } from "./AccountStatementSection";

export default function ClientPortal() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: projects, isLoading } = useListProjects();
  const { data: clientCampaigns = [] } = useListClientCampaigns();

  const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  const [scrolled, setScrolled] = useState(false);
  React.useEffect(() => {
    if (!isLoading && hash && !scrolled) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        setScrolled(true);
      }, 300);
    }
  }, [isLoading, hash, scrolled]);

  React.useEffect(() => {
    const onHashChange = () => {
      const id = window.location.hash.slice(1);
      if (id) {
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
    );
  }

  const sharedCampaigns = (clientCampaigns as any[]).filter((c: any) => c.shared);
  const hasCampaigns = sharedCampaigns.length > 0;
  const hasProjectProposals = (user as any)?.canViewProposal !== false && (projects ?? []).some((p: any) => p.finalProposedIdea);
  const hasProposals = hasCampaigns || hasProjectProposals;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight uppercase">
          {t("clientPortal")}
        </h1>
        <p className="text-muted-foreground">
          {t("welcome")}, {user?.name}. {t("hereIsYourProjects")}
        </p>
      </div>

      {hasProposals && (
        <section id="proposals" className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("yourProposals")}</h2>
          </div>
          {hasCampaigns && (
            <div className="space-y-6">
              {sharedCampaigns.map((campaign) => (
                <CampaignView key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
          <ProjectProposals projects={projects ?? []} />
        </section>
      )}

      <section id="projects" className="space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("yourProjects")}</h2>
        </div>
        {!projects?.length ? (
          <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
            {t("noActiveProjects")}
          </div>
        ) : (
          <div className="space-y-12">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <AccountStatementSection projects={projects ?? []} />
    </div>
  );
}
