import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserCog, Eye, EyeOff, Pencil, FileText, DollarSign, ShieldCheck, Search } from "lucide-react";

interface ClientAccount {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  userId: number;
  username: string;
  canViewProposal: boolean;
  canViewFinancials: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchClientAccounts(): Promise<ClientAccount[]> {
  const res = await fetch(`${BASE}/api/client-accounts`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch client accounts");
  return res.json();
}

async function updateClientAccount(id: number, data: Partial<{
  username: string;
  password: string;
  canViewProposal: boolean;
  canViewFinancials: boolean;
}>): Promise<ClientAccount> {
  const res = await fetch(`${BASE}/api/client-accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update account");
  }
  return res.json();
}

function EditAccountDialog({ account, onClose }: { account: ClientAccount; onClose: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [username, setUsername] = useState(account.username);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateClientAccount>[1]) =>
      updateClientAccount(account.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-accounts"] });
      toast({ description: t("accountUpdated") });
      onClose();
    },
    onError: () => toast({ variant: "destructive", description: t("failedToUpdateAccount") }),
  });

  const handleSave = () => {
    const data: Parameters<typeof updateClientAccount>[1] = {};
    if (username.trim() && username !== account.username) data.username = username.trim();
    if (password.trim()) data.password = password.trim();
    if (Object.keys(data).length === 0) { onClose(); return; }
    mutation.mutate(data);
  };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <Label className="text-sm font-medium">{t("usernameLabel")}</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 rounded-xl"
          placeholder={t("usernamePlaceholder")}
        />
      </div>
      <div>
        <Label className="text-sm font-medium">{t("newPassword")}</Label>
        <div className="relative mt-1">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("leaveBlank")}
            className="pr-10 rounded-xl"
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
      <div className="flex gap-3 justify-end pt-2 border-t border-border">
        <Button variant="outline" className="rounded-xl" onClick={onClose}>{t("cancel")}</Button>
        <Button
          className="rounded-xl px-6"
          onClick={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? t("savingEllipsis2") : t("save")}
        </Button>
      </div>
    </div>
  );
}

function PermissionToggle({
  account,
  field,
  label,
  icon: Icon,
}: {
  account: ClientAccount;
  field: "canViewProposal" | "canViewFinancials";
  label: string;
  icon: React.ElementType;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      await updateClientAccount(account.id, { [field]: !account[field] });
      qc.invalidateQueries({ queryKey: ["client-accounts"] });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateAccount") });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-slate-50/60">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400 dark:text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <Switch
        checked={account[field]}
        onCheckedChange={toggle}
        disabled={pending}
      />
    </div>
  );
}

export default function ClientAccounts() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: accounts = [], isLoading } = useQuery<ClientAccount[]>({
    queryKey: ["client-accounts"],
    queryFn: fetchClientAccounts,
    enabled: user?.role === "admin",
  });

  const filtered = accounts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.phone && a.phone.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      a.username.toLowerCase().includes(q)
    );
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        {t("accessDenied")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("clientAccountsTitle")}</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 text-sm">
          {t("clientAccountsDesc")}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">{t("loading")}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
          {t("noClientAccounts")}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchClientAccounts")}
              className="pl-9 rounded-xl"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noResults")}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((account) => (
            <Card key={account.id} className="border-border bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                          @{account.username}
                        </Badge>
                        {account.email && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">{account.email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Dialog
                    open={editingId === account.id}
                    onOpenChange={(open) => setEditingId(open ? account.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-8">
                        <Pencil className="h-3.5 w-3.5" />
                        {t("editAccount")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                          {t("editAccount")} — {account.name}
                        </DialogTitle>
                      </DialogHeader>
                      <EditAccountDialog
                        account={account}
                        onClose={() => setEditingId(null)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pt-0">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  {t("portalPermissions")}
                </p>
                <PermissionToggle
                  account={account}
                  field="canViewProposal"
                  label={t("viewProposal")}
                  icon={FileText}
                />
                <PermissionToggle
                  account={account}
                  field="canViewFinancials"
                  label={t("viewFinancialsPerm")}
                  icon={DollarSign}
                />
              </CardContent>
            </Card>
            ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
