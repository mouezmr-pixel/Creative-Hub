import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function ProjectProposals({ projects }: { projects: any[] }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canSeeProposal = (user as any)?.canViewProposal !== false;
  if (!canSeeProposal) return null;

  const proposals = projects.filter((p: any) => p.finalProposedIdea);
  if (proposals.length === 0) return null;

  return (
    <div className="space-y-4">
      {proposals.map((project: any) => (
        <Card key={project.id} className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 text-sm">
                {t("finalProposal")} &mdash; {project.title}
              </h4>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {project.finalProposedIdea}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
