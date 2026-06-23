import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useDisplayCurrency, CURRENCIES, Currency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Sun, Moon, Palette, Coins, Building2, FileText, Image, Stamp, X, Upload, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StudioSettings {
  name: string; description: string;
  address: string; phone: string; email: string; website: string; taxId: string;
  invoicePrefix: string; proformaPrefix: string;
  paymentTerms: string; invoiceFooter: string; invoiceNotes: string;
  logoUrl: string; stampUrl: string;
  showStamp: string; showSignature: string;
}

async function fetchSettings(): Promise<StudioSettings> {
  const res = await fetch(`${BASE}/api/settings`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSettings(data: Partial<StudioSettings>): Promise<StudioSettings> {
  const res = await fetch(`${BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

async function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch(`${BASE}/api/settings/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ data: dataUrl, name: file.name }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          reject(new Error(err.error));
          return;
        }
        const result = await res.json();
        resolve(result.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { currency: displayCurrency, setCurrency: setDisplayCurrency } = useDisplayCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const { data: studio } = useQuery({
    queryKey: ["studio-settings"],
    queryFn: fetchSettings,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [proformaPrefix, setProformaPrefix] = useState("PF-");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [invoiceFooter, setInvoiceFooter] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [stampUrl, setStampUrl] = useState("");
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  useEffect(() => {
    if (studio) {
      setName(studio.name);
      setDescription(studio.description);
      setAddress(studio.address ?? "");
      setPhone(studio.phone ?? "");
      setEmail(studio.email ?? "");
      setWebsite(studio.website ?? "");
      setTaxId(studio.taxId ?? "");
      setInvoicePrefix(studio.invoicePrefix ?? "INV-");
      setProformaPrefix(studio.proformaPrefix ?? "PF-");
      setPaymentTerms(studio.paymentTerms ?? "");
      setInvoiceFooter(studio.invoiceFooter ?? "");
      setInvoiceNotes(studio.invoiceNotes ?? "");
      setLogoUrl(studio.logoUrl ?? "");
      setStampUrl(studio.stampUrl ?? "");
      setShowStamp(studio.showStamp !== "false");
      setShowSignature(studio.showSignature !== "false");
    }
  }, [studio]);

  const saveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-settings"] });
      toast({ description: t("savedPreferences") });
    },
    onError: () => toast({ variant: "destructive", description: t("failedToSave") }),
  });

  const invoiceSaveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-settings"] });
      toast({ description: t("savedPreferences") });
    },
    onError: () => toast({ variant: "destructive", description: t("failedToSave") }),
  });

  const handleStudioSave = () => {
    saveMutation.mutate({ name, description });
  };

  const handleBrandSave = () => {
    invoiceSaveMutation.mutate({ logoUrl, stampUrl, showStamp: showStamp ? "true" : "false", showSignature: showSignature ? "true" : "false" });
  };

  const handleInvoiceSave = () => {
    invoiceSaveMutation.mutate({ address, phone, email, website, taxId, invoicePrefix, proformaPrefix, paymentTerms, invoiceFooter, invoiceNotes, logoUrl, stampUrl, showStamp: showStamp ? "true" : "false", showSignature: showSignature ? "true" : "false" });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file);
      setLogoUrl(url);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStamp(true);
    try {
      const url = await uploadFile(file);
      setStampUrl(url);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    } finally {
      setUploadingStamp(false);
    }
  };

  const removeLogo = () => setLogoUrl("");
  const removeStamp = () => setStampUrl("");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          {t("settings")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t("settingsDesc")}</p>
      </div>

      {/* ── Preferences: Theme + Default Currency ── */}
      <Card className="bg-white border-border dark:bg-slate-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t("preferences")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {t("appearance")}
            </Label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{t("theme")}</p>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-3.5 w-3.5" /> {t("themeLight")}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-3.5 w-3.5" /> {t("themeDark")}
              </Button>
            </div>
          </div>

          {/* Default currency */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" />
              {t("defaultCurrencySetting")}
            </Label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{t("defaultCurrencyDesc")}</p>
            <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as Currency)}>
              <SelectTrigger className="rounded-lg w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="font-medium">{c.flag} {c.symbol}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Studio Information ── */}
      <Card className="bg-white border-border dark:bg-slate-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t("studioInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("studioName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("brandName")}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("studioTagline")}
              className="mt-1 rounded-xl"
              rows={3}
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleStudioSave} disabled={saveMutation.isPending} className="rounded-xl px-6">
              {saveMutation.isPending ? t("savingEllipsis2") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice Settings ── */}
      <Card className="bg-white border-border dark:bg-slate-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("invoiceSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">{t("invoiceSettingsDesc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoiceAddress")}</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 rounded-xl" rows={2} />
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoicePhone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoiceEmail")}</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoiceWebsite")}</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoiceTaxId")}</Label>
                <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="mt-1 rounded-xl" />
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoicePrefix")}</Label>
              <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder={t("invoicePrefixPlaceholder")} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("proformaPrefix")}</Label>
              <Input value={proformaPrefix} onChange={(e) => setProformaPrefix(e.target.value)} placeholder={t("proformaPrefixPlaceholder")} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentTerms")}</Label>
              <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder={t("paymentTermsPlaceholder")} className="mt-1 rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoiceFooter")}</Label>
            <Input value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)} className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("invoiceNotes")}</Label>
            <Textarea value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} className="mt-1 rounded-xl" rows={2} />
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleInvoiceSave} disabled={invoiceSaveMutation.isPending} className="rounded-xl px-6">
              {invoiceSaveMutation.isPending ? t("savingEllipsis2") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Brand Assets (Logo, Stamp, Signature) ── */}
      <Card className="bg-white border-border dark:bg-slate-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Image className="h-4 w-4" />
            {t("brandAssets")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">{t("brandAssetsDesc")}</p>

          {/* Studio Logo */}
          <div className="border border-border rounded-xl p-4">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              {t("studioLogo")}
            </Label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-3">{t("studioLogoDesc")}</p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {logoUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <img src={`${BASE}${logoUrl}`} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{logoUrl.split("/").pop()}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("logoUploaded")}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg" onClick={removeLogo}>
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                <Upload className="h-3.5 w-3.5" />
                {uploadingLogo ? t("uploading") : t("uploadLogo")}
              </Button>
            )}
          </div>

          {/* Studio Stamp */}
          <div className="border border-border rounded-xl p-4">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Stamp className="h-4 w-4 text-primary" />
              {t("studioStamp")}
            </Label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-3">{t("studioStampDesc")}</p>
            <input
              ref={stampInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleStampUpload}
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {stampUrl ? (
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <img src={`${BASE}${stampUrl}`} alt="Stamp" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{stampUrl.split("/").pop()}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("stampUploaded")}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg" onClick={removeStamp}>
                    <X className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => stampInputRef.current?.click()} disabled={uploadingStamp}>
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingStamp ? t("uploading") : t("uploadStamp")}
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Switch id="show-stamp" checked={showStamp} onCheckedChange={setShowStamp} />
                <Label htmlFor="show-stamp" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">{t("showOnInvoice")}</Label>
              </div>
            </div>
          </div>

          {/* Client Signature toggle */}
          <div className="border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  {t("clientSignature")}
                </Label>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("clientSignatureDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-signature" checked={showSignature} onCheckedChange={setShowSignature} />
                <Label htmlFor="show-signature" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">{showSignature ? t("enabled") : t("disabled")}</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleBrandSave} disabled={invoiceSaveMutation.isPending} className="rounded-xl px-6">
              {invoiceSaveMutation.isPending ? t("savingEllipsis2") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{t("demoCredentials")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              { role: t("roleAdmin"), username: "admin", password: "admin123" },
              { role: t("rolePhotographer"), username: "photographer1", password: "photo123" },
              { role: t("roleClient"), username: "client1", password: "client123" },
            ].map((cred) => (
              <div key={cred.username} className="bg-background/40 rounded-lg p-3 border border-border/30">
                <div className="font-medium text-primary">{cred.role}</div>
                <div className="text-muted-foreground mt-1">
                  <div>{t("userLabel")} <code className="text-foreground">{cred.username}</code></div>
                  <div>{t("passLabel")} <code className="text-foreground">{cred.password}</code></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
