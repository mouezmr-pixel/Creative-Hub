import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListClients,
  useCreateClient,
  useDeleteClient,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Trash2, User, Phone, Mail,
  Copy, Check, Eye, EyeOff, Link2, KeyRound,
} from "lucide-react";
import { useForm } from "react-hook-form";

const LOGIN_URL = `${window.location.origin}/login`;

function CopyButton({ text, label: labelProp }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const label = labelProp ?? t("copy");
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0 h-8 text-xs">
      {copied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? t("copied") : label}
    </Button>
  );
}

function StepBadge({ number, label, icon: Icon, color }: { number: number; label: string; icon: any; color: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3`}>
      <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
        {number}
      </div>
      <Icon className={`h-4 w-4`} style={{ color: color.replace("bg-", "text-") }} />
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    </div>
  );
}

export default function Clients() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, setLocation] = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const params = user?.role === "photographer" ? { photographerId: user.id } : {};
  const { data: clients = [], isLoading } = useListClients(params);
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const { register, handleSubmit, reset } = useForm<{
    name: string;
    email: string;
    phone: string;
  }>();

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const resetForm = () => {
    reset();
    setPassword("");
    setShowPassword(false);
  };

  const onSubmit = async (data: any) => {
    try {
      await createClient.mutateAsync({
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          password: password || null,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      toast({ description: t("clientCreated") });
      resetForm();
      setIsCreateOpen(false);
    } catch {
      toast({ variant: "destructive", description: t("failedToCreateClient") });
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("deleteClientConfirm"))) return;
    try {
      await deleteClient.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      toast({ description: t("clientDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteClient") });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("clients")}</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{filteredClients.length} {t("clients").toLowerCase()}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              {t("newClient")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-2xl p-0 flex flex-col" style={{ maxHeight: "94vh" }}>
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-border px-6 py-4 rounded-t-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("newClient")}</DialogTitle>
              </DialogHeader>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

              {/* ── Basic Info ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("name")} *</Label>
                  <Input {...register("name", { required: true })} placeholder={t("clientNamePlaceholder")} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("email")}</Label>
                  <Input {...register("email")} type="email" placeholder={t("clientEmailPlaceholder")} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("phone")}</Label>
                  <Input {...register("phone")} placeholder={t("clientPhonePlaceholder")} className="mt-1 rounded-xl" />
                </div>
              </div>

              {/* ── Portal Access ── */}
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{t("clientPortalAccess")}</span>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("passwordCreatesLogin")}</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("portalPassword")}
                        className="pr-9 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-400"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("loginUrlLabel")}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={LOGIN_URL} readOnly className="text-xs bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded-xl cursor-default" />
                    <CopyButton text={LOGIN_URL} />
                  </div>
                </div>
              </div>


              {/* ── Actions ── */}
              <div className="flex gap-3 justify-end pt-2 border-t border-border">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="rounded-xl px-6" disabled={createClient.isPending}>
                  {createClient.isPending ? t("creatingEllipsis") : t("create")}
                </Button>
              </div>
            </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 bg-white dark:bg-slate-900 border-border rounded-xl"
          placeholder={t("searchClients")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Clients grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("loadingClients")}</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
          {t("noClientsFound")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link href={`/clients/${client.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border-border bg-white dark:bg-slate-900 shadow-sm h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg leading-tight">{client.name}</h3>
                          {(client as any).loginUsername && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Link2 className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{(client as any).loginUsername}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {user?.role === "admin" && (
                        <button
                          onClick={(e) => handleDelete(client.id, e)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      {client.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {(client as any).photographerName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{(client as any).photographerName}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
