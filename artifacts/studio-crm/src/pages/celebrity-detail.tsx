import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetCelebrity,
  useUpdateCelebrity,
  useDeleteCelebrity,
  useListCelebrityOffers,
  useCreateCelebrityOffer,
  useUpdateCelebrityOffer,
  useDeleteCelebrityOffer,
  getGetCelebrityQueryKey,
  getListCelebritiesQueryKey,
  getListCelebrityOffersQueryKey,
} from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Star, Phone, Mail, Users, Tag, DollarSign, Calendar, Pencil, Trash2, Upload, Megaphone, Plus, CheckCircle2, X, Camera,
} from "lucide-react";
import { normalizeArray } from "@/lib/utils";
import { CelebrityAvatar } from "@/components/celebrity-avatar";

const AUDIENCE_OPTIONS = ["children", "teens", "youth", "adults", "families", "all"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#000000",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  snapchat: "#FFFC00",
  facebook: "#1877F2",
};

interface PlatformEntry {
  name: string;
  url?: string | null;
}

export default function CelebrityDetail() {
  const params = useParams();
  const id = parseInt(params?.id ?? "0", 10);
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: celebrity, isLoading } = useGetCelebrity(id);
  const { data: offers = [] } = useListCelebrityOffers(id);
  const updateCelebrity = useUpdateCelebrity();
  const deleteCelebrity = useDeleteCelebrity();
  const createOffer = useCreateCelebrityOffer();
  const updateOffer = useUpdateCelebrityOffer();
  const deleteOffer = useDeleteCelebrityOffer();

  const [activeTab, setActiveTab] = useState<string>("info");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [isUploading, setIsUploading] = useState(false);
  const originalImageRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({ title: "", description: "", budget: "" });
  const [showPlatformInput, setShowPlatformInput] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ name: "", url: "" });

  const uploadImage = async (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    return new Promise<string>((resolve, reject) => {
      reader.onload = async () => {
        try {
          setIsUploading(true);
          const res = await fetch("/api/settings/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ data: reader.result, name: file.name }),
          });
          if (!res.ok) throw new Error("Upload failed");
          const json = await res.json();
          setForm((prev: any) => ({ ...prev, image: json.url }));
          resolve(json.url);
        } catch (e) {
          reject(e);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  };

  useEffect(() => {
    if (celebrity && !isEditing) {
      originalImageRef.current = celebrity.image ?? null;
      setForm({
        name: celebrity.name,
        phone: celebrity.phone ?? "",
        email: celebrity.email ?? "",
        image: celebrity.image ?? "",
        audiences: celebrity.audiences ?? [],
        interests: JSON.stringify(celebrity.interests ?? []),
        dateOfBirth: celebrity.dateOfBirth ? celebrity.dateOfBirth.slice(0, 10) : "",
        tags: JSON.stringify(celebrity.tags ?? []),
        platforms: celebrity.platforms ?? [],
        priceMin: celebrity.priceMin?.toString() ?? "",
        priceMax: celebrity.priceMax?.toString() ?? "",
        bio: celebrity.bio ?? "",
      });
    }
  }, [celebrity, isEditing]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetCelebrityQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListCelebritiesQueryKey() });
  };

  const invalidateOffers = () => {
    queryClient.invalidateQueries({ queryKey: getListCelebrityOffersQueryKey(id) });
  };

  const TABS_LABELS: Record<string, string> = {
    info: t("celebrityInformation"),
    offers: t("offers"),
  };

  if (isLoading || !celebrity) {
    return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  }

  const startEdit = () => {
    originalImageRef.current = celebrity.image ?? null;
    setForm({
      name: celebrity.name,
      phone: celebrity.phone ?? "",
      email: celebrity.email ?? "",
      image: celebrity.image ?? "",
      audiences: celebrity.audiences ?? [],
      interests: JSON.stringify(celebrity.interests ?? []),
      dateOfBirth: celebrity.dateOfBirth ? celebrity.dateOfBirth.slice(0, 10) : "",
      tags: JSON.stringify(celebrity.tags ?? []),
      platforms: celebrity.platforms ?? [],
      priceMin: celebrity.priceMin?.toString() ?? "",
      priceMax: celebrity.priceMax?.toString() ?? "",
      bio: celebrity.bio ?? "",
    });
    setIsEditing(true);
  };

  const toggleAudience = (value: string) => {
    const current = form.audiences || [];
    if (current.includes(value)) {
      setForm({ ...form, audiences: current.filter((v: string) => v !== value) });
    } else {
      setForm({ ...form, audiences: [...current, value] });
    }
  };

  const addPlatformEntry = () => {
    if (!newPlatform.name.trim()) return;
    const current: PlatformEntry[] = form.platforms || [];
    setForm({ ...form, platforms: [...current, { name: newPlatform.name.trim(), url: newPlatform.url.trim() || null }] });
    setNewPlatform({ name: "", url: "" });
    setShowPlatformInput(false);
  };

  const removePlatform = (index: number) => {
    const current: PlatformEntry[] = form.platforms || [];
    setForm({ ...form, platforms: current.filter((_: any, i: number) => i !== index) });
  };

  const handleSave = async () => {
    try {
      const imageChanged = form.image !== originalImageRef.current;
      await updateCelebrity.mutateAsync({
        id,
        data: {
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          ...(imageChanged ? { image: form.image || null } : {}),
          audiences: form.audiences?.length ? form.audiences : null,
          interests: form.interests ? normalizeArray(form.interests) : null,
          dateOfBirth: form.dateOfBirth || null,
          tags: form.tags ? normalizeArray(form.tags) : null,
          platforms: form.platforms?.length ? form.platforms : null,
          priceMin: form.priceMin ? parseFloat(form.priceMin) : null,
          priceMax: form.priceMax ? parseFloat(form.priceMax) : null,
          bio: form.bio || null,
        },
      });
      invalidate();
      setIsEditing(false);
      toast({ description: t("celebrityUpdated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateCelebrity") });
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("deleteCelebrityConfirm"))) return;
    try {
      await deleteCelebrity.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCelebritiesQueryKey() });
      toast({ description: t("celebrityDeleted") });
      window.location.href = "/celebrities";
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteCelebrity") });
    }
  };

  const handleCreateOffer = async () => {
    if (!newOffer.title.trim()) return;
    try {
      await createOffer.mutateAsync({
        data: {
          celebrityId: id,
          title: newOffer.title.trim(),
          description: newOffer.description || null,
          budget: newOffer.budget ? parseFloat(newOffer.budget) : null,
        },
      });
      setIsOfferDialogOpen(false);
      setNewOffer({ title: "", description: "", budget: "" });
      invalidateOffers();
      toast({ description: t("offerCreated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToCreateOffer") });
    }
  };

  const handleUpdateOfferStatus = async (offerId: number, status: string) => {
    try {
      await updateOffer.mutateAsync({ id: offerId, data: { status } });
      invalidateOffers();
      toast({ description: t("offerUpdated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateOffer") });
    }
  };

  const handleUpdateOfferDetail = async (offerId: number, field: string, value: string) => {
    try {
      await updateOffer.mutateAsync({ id: offerId, data: { [field]: value } });
      invalidateOffers();
      toast({ description: t("saved") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateOffer") });
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    if (!confirm(t("deleteOfferConfirm"))) return;
    try {
      await deleteOffer.mutateAsync({ id: offerId });
      invalidateOffers();
      toast({ description: t("offerDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteOffer") });
    }
  };

  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-700",
    rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
    completed: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
  };

  const formatPriceRange = () => {
    if (celebrity.priceMin != null && celebrity.priceMax != null) {
      return `${Number(celebrity.priceMin).toLocaleString()} \u2013 ${Number(celebrity.priceMax).toLocaleString()} DZD`;
    }
    if (celebrity.priceMin != null) return `${Number(celebrity.priceMin).toLocaleString()}+ DZD`;
    if (celebrity.priceMax != null) return `0 \u2013 ${Number(celebrity.priceMax).toLocaleString()} DZD`;
    return null;
  };

  const tags = normalizeArray(celebrity.tags);
  const audiences = normalizeArray(celebrity.audiences);
  const interests = normalizeArray(celebrity.interests);
  const platforms = (celebrity.platforms || []) as PlatformEntry[];

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? "\u2014"}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/celebrities">
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 text-xs h-8 px-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("backToList")}
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {celebrity.name}
              </span>
              <Star className="h-4 w-4 text-amber-500 shrink-0" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("addedOn")} {new Date(celebrity.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(false)}>{t("cancel")}</Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateCelebrity.isPending}>
                {updateCelebrity.isPending ? t("saving") : t("save")}
              </Button>
            </>
          ) : (
            <>
              {activeTab === "info" && (
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("edit")}
                </Button>
              )}
              <Button variant="destructive" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                {t("delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {Object.entries(TABS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === "info" && !isEditing && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("price")}</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "#EF9F27" }}>
                {formatPriceRange() ?? "\u2014"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("age")}</p>
              <p className="text-sm font-medium mt-0.5 text-slate-900 dark:text-slate-100">
                {celebrity.age != null ? `${celebrity.age} ${t("age")}` : "\u2014"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("dateOfBirth")}</p>
              <p className="text-sm font-medium mt-0.5 text-slate-900 dark:text-slate-100">
                {celebrity.dateOfBirth ? new Date(celebrity.dateOfBirth).toLocaleDateString() : "\u2014"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <div className="flex flex-col gap-3">
              {/* Tags & Categories */}
              <Card>
                <CardContent className="p-3 space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    {t("tagsAndCategories")}
                  </h4>
                  {tags.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">{t("tags")}</p>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#EEEDFE", color: "#534AB7" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {audiences.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">{t("audience")}</p>
                      <div className="flex flex-wrap gap-1">
                        {audiences.map((a, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>
                            {t(`audience_${a}` as any) || a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {interests.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">{t("interests")}</p>
                      <div className="flex flex-wrap gap-1">
                        {interests.map((interest, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#FBEAF0", color: "#993556" }}>
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {tags.length === 0 && audiences.length === 0 && interests.length === 0 && (
                    <p className="text-xs text-muted-foreground">\u2014</p>
                  )}
                </CardContent>
              </Card>

              {/* Platforms */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Camera className="h-3 w-3" />
                    {t("platforms")}
                  </h4>
                  {platforms.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border border-border rounded"
                          style={PLATFORM_COLORS[p.name.toLowerCase()] ? { borderColor: PLATFORM_COLORS[p.name.toLowerCase()], color: PLATFORM_COLORS[p.name.toLowerCase()] } : {}}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noPlatforms")}</p>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {t("contactInfo")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("email")}</p>
                      <p className="text-xs text-slate-900 dark:text-slate-100">{celebrity.email || "\u2014"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("phone")}</p>
                      <p className="text-xs text-slate-900 dark:text-slate-100" dir="ltr">{celebrity.phone || "\u2014"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              {/* Image */}
              <Card>
                <CardContent className="p-3">
                  <div className="bg-muted/30 border border-border rounded-lg aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {celebrity.image ? (
                      <img src={celebrity.image} alt={celebrity.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Camera className="h-8 w-8 mx-auto mb-1" />
                        <p className="text-xs">{t("noImage")}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bio / Notes */}
              <Card>
                <CardContent className="p-3 space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="text-xs">{t("bio")}</span>
                  </h4>
                  {celebrity.bio ? (
                    <p className="text-xs text-slate-900 dark:text-slate-100">{celebrity.bio}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noBio")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Tab: Info - Edit Mode */}
      {activeTab === "info" && isEditing && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>{t("name")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-sm h-9" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("phone")}</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="text-sm h-9" />
                  </div>
                  <div>
                    <Label>{t("email")}</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="text-sm h-9" />
                  </div>
                </div>
                <div>
                  <Label>{t("image")}</Label>
                  <div className="flex gap-2">
                    <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder={t("imagePlaceholder")} className="flex-1 text-sm h-9" />
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title={t("upload")} className="h-9 w-9">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {form.image && (
                    <img src={form.image} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
                <div>
                  <Label>{t("audience")}</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {AUDIENCE_OPTIONS.map((a) => (
                      <label key={a} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={(form.audiences || []).includes(a)} onCheckedChange={() => toggleAudience(a)} />
                        {t(`audience_${a}`)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("dateOfBirth")}</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="text-sm h-9" />
                  </div>
                  <div>
                    <Label>{t("interests")}</Label>
                    <Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder={t("interestsJsonPlaceholder")} className="text-sm h-9" />
                  </div>
                </div>
                <div>
                  <Label>{t("tags")}</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={t("tagsJsonPlaceholder")} className="text-sm h-9" />
                </div>
                <div>
                  <Label>{t("platforms")}</Label>
                  <div className="space-y-1.5 mt-1">
                    {(form.platforms || []).map((p: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="flex-1">{p.name}</span>
                        {p.url && <span className="text-muted-foreground truncate max-w-[120px]">{p.url}</span>}
                        <button type="button" onClick={() => removePlatform(idx)} className="text-red-500 hover:text-red-700">&times;</button>
                      </div>
                    ))}
                    {showPlatformInput ? (
                      <div className="flex gap-1.5 items-center">
                        <Input
                          value={newPlatform.name}
                          onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                          placeholder={t("platformName")}
                          className="text-xs h-7 flex-1"
                        />
                        <Input
                          value={newPlatform.url}
                          onChange={(e) => setNewPlatform({ ...newPlatform, url: e.target.value })}
                          placeholder={t("platformUrl")}
                          className="text-xs h-7 flex-1"
                        />
                        <Button type="button" size="sm" className="h-7 text-xs px-2" onClick={addPlatformEntry}>+</Button>
                        <button type="button" onClick={() => setShowPlatformInput(false)} className="text-xs text-muted-foreground">{t("cancel")}</button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7 w-full border-dashed" onClick={() => setShowPlatformInput(true)}>
                        + {t("addPlatform")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("priceMin")}</Label>
                    <Input type="number" step="0.01" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} className="text-sm h-9" />
                  </div>
                  <div>
                    <Label>{t("priceMax")}</Label>
                    <Input type="number" step="0.01" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} className="text-sm h-9" />
                  </div>
                </div>
                <div>
                  <Label>{t("bio")}</Label>
                  <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="text-sm" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {form.image && (
              <Card>
                <CardContent className="p-4">
                  <img src={form.image} alt="Preview" className="w-full h-48 object-cover rounded-lg" onError={(e) => (e.currentTarget.style.display = "none")} />
                </CardContent>
              </Card>
            )}
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground">{t("price")}</h4>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100" dir="ltr" style={{ color: "#EF9F27" }}>
                  {form.priceMin || form.priceMax
                    ? `${Number(form.priceMin || 0).toLocaleString()} \u2013 ${Number(form.priceMax || 0).toLocaleString()} DZD`
                    : "\u2014"}
                </p>
                {form.dateOfBirth && (
                  <p className="text-xs text-muted-foreground">
                    {t("dateOfBirth")}: {form.dateOfBirth}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Offers */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("offers")}
            </h2>
            <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs h-8">
                  <Plus className="h-3.5 w-3.5" />
                  {t("newOffer")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("newOffer")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("offerTitle")}</Label>
                    <Input value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })} placeholder={t("offerTitlePlaceholder")} />
                  </div>
                  <div>
                    <Label>{t("offerDescription")}</Label>
                    <Textarea value={newOffer.description} onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })} rows={3} />
                  </div>
                  <div>
                    <Label>{t("offerBudget")}</Label>
                    <Input type="number" step="0.01" value={newOffer.budget} onChange={(e) => setNewOffer({ ...newOffer, budget: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setIsOfferDialogOpen(false); setNewOffer({ title: "", description: "", budget: "" }); }}>
                      {t("cancel")}
                    </Button>
                    <Button onClick={handleCreateOffer} disabled={createOffer.isPending || !newOffer.title.trim()}>
                      {createOffer.isPending ? t("creating") : t("create")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {(offers as any[]).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-card/30 rounded-lg border border-border">
              <Megaphone className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-xs">{t("noOffersYet")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(offers as any[]).map((offer: any) => (
                <Card key={offer.id} className="border-border/80">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{offer.title}</h3>
                        </div>
                        {offer.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{offer.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_BADGE[offer.status] || "bg-slate-100 text-slate-600"}`}>
                          {(t as any)(`offerStatus_${offer.status}`)}
                        </span>
                      </div>
                    </div>

                    {offer.budget != null && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium" dir="ltr">{Number(offer.budget).toLocaleString()} DZD</span>
                      </div>
                    )}

                    {(offer.status === "approved" || offer.status === "completed") && (
                      <div className="border-t border-border/50 pt-3 space-y-2">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {t("workDetails")}
                        </h4>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("scenario")}</Label>
                          <Textarea
                            defaultValue={offer.scenario ?? ""}
                            onBlur={(e) => handleUpdateOfferDetail(offer.id, "scenario", e.target.value)}
                            rows={2}
                            className="mt-0.5 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("script")}</Label>
                          <Textarea
                            defaultValue={offer.script ?? ""}
                            onBlur={(e) => handleUpdateOfferDetail(offer.id, "script", e.target.value)}
                            rows={2}
                            className="mt-0.5 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t("idea")}</Label>
                          <Textarea
                            defaultValue={offer.idea ?? ""}
                            onBlur={(e) => handleUpdateOfferDetail(offer.id, "idea", e.target.value)}
                            rows={2}
                            className="mt-0.5 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                      {offer.status === "pending" && (
                        <>
                          <Button size="sm" variant="default" onClick={() => handleUpdateOfferStatus(offer.id, "approved")} className="gap-1 text-xs h-7">
                            <CheckCircle2 className="h-3 w-3" />
                            {t("approve")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateOfferStatus(offer.id, "rejected")} className="gap-1 text-xs h-7 text-red-600">
                            <X className="h-3 w-3" />
                            {t("reject")}
                          </Button>
                        </>
                      )}
                      {offer.status === "approved" && (
                        <Button size="sm" variant="default" onClick={() => handleUpdateOfferStatus(offer.id, "completed")} className="gap-1 text-xs h-7">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("complete")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteOffer(offer.id)} className="gap-1 text-xs h-7 text-red-500 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                        {t("delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}