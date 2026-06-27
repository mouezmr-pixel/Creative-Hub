import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetClient,
  useUpdateClient,
  useListProjects,
  useListUsers,
  getGetClientQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit3, Check, X } from "lucide-react";

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id!, 10);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: client, isLoading } = useGetClient(id);
  const { data: projects = [] } = useListProjects();
  const { data: photographers = [] } = useListUsers();
  const updateClient = useUpdateClient();

  const clientProjects = projects.filter((p) => p.clientId === id);
  const photographerUsers = photographers.filter((u) => u.role === "photographer");

  const startEdit = () => {
    if (!client) return;
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      originalIdea: client.originalIdea ?? "",
      proposedIdea: client.proposedIdea ?? "",
      photographerId: String(client.photographerId ?? ""),
    });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    try {
      await updateClient.mutateAsync({
        id,
        data: {
          name: form.name || undefined,
          email: form.email || null,
          phone: form.phone || null,
          originalIdea: form.originalIdea || null,
          proposedIdea: form.proposedIdea || null,
          photographerId: form.photographerId ? parseInt(form.photographerId) : null,
        },
      });
      qc.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
      toast({ description: t("clientUpdated") });
      setIsEditing(false);
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateClient") });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-500";
      case "in_progress": return "bg-blue-500/20 text-blue-500";
      case "completed": return "bg-green-500/20 text-green-500";
      case "archived": return "bg-gray-500/20 text-gray-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!client) return <div className="text-center py-12 text-muted-foreground">{t("clientNotFound")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight uppercase flex-1">
          {client.name}
        </h1>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={startEdit} className="gap-2">
            <Edit3 className="h-4 w-4" /> {t("edit")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={updateClient.isPending} className="gap-2">
              <Check className="h-4 w-4" /> {t("save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
              <X className="h-4 w-4" /> {t("cancel")}
            </Button>
          </div>
        )}
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold uppercase tracking-wider text-muted-foreground">{t("clientInformation")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isEditing ? (
            <>
              <div className="space-y-1">
                <Label>{t("name")}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("email")}</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("phone")}</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              {user?.role === "admin" && (
                <div className="space-y-1">
                  <Label>{t("photographerLabel")}</Label>
                  <Select value={form.photographerId} onValueChange={val => setForm(f => ({ ...f, photographerId: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("photographerLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {photographerUsers.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 md:col-span-2">
                <Label>{t("originalIdea")}</Label>
                <Textarea value={form.originalIdea} onChange={e => setForm(f => ({ ...f, originalIdea: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>{t("proposedIdea")}</Label>
                <Textarea value={form.proposedIdea} onChange={e => setForm(f => ({ ...f, proposedIdea: e.target.value }))} rows={3} />
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{t("email")}</span>
                <span>{client.email || "—"}</span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{t("phone")}</span>
                <span>{client.phone || "—"}</span>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{t("photographerLabel")}</span>
                <span>{client.photographerName || "—"}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{t("originalIdea")}</span>
                <p className="text-sm">{client.originalIdea || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{t("proposedIdea")}</span>
                <p className="text-sm text-primary">{client.proposedIdea || "—"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-serif font-bold uppercase tracking-tight mb-4">{t("projects")}</h2>
        {clientProjects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-lg border border-border">
            {t("noProjectsForClient")}
          </div>
        ) : (
          <div className="space-y-3">
            {clientProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:bg-card/80 transition-colors cursor-pointer border-l-4 border-l-transparent bg-card/50 border-border/50">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{project.title}</h3>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{t("projectProgress")}</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-1.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge className={getStatusColor(project.status)} variant="outline">
                        {t(project.status as any) || project.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
