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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft, Star, Phone, Mail, Users, Tag, DollarSign, Calendar, Pencil, Trash2, ImageIcon, Upload, Megaphone, Plus, CheckCircle2, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AUDIENCE_OPTIONS = ["children", "teens", "youth", "adults", "families", "all"] as const;

function safeParseJsonArray(val: string): string[] | null {
  if (!val.trim()) return null;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    return [String(parsed)].filter(Boolean);
  } catch {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
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
          interests: form.interests ? safeParseJsonArray(form.interests) : null,
          dateOfBirth: form.dateOfBirth || null,
          tags: form.tags ? safeParseJsonArray(form.tags) : null,
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
      return `${Number(celebrity.priceMin).toLocaleString()} - ${Number(celebrity.priceMax).toLocaleString()} DZD`;
    }
    if (celebrity.priceMin != null) return `${Number(celebrity.priceMin).toLocaleString()}+ DZD`;
    if (celebrity.priceMax != null) return `0 - ${Number(celebrity.priceMax).toLocaleString()} DZD`;
    return null;
  };

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-slate-900 dark:text-slate-100">{value ?? "—"}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/celebrities">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Star className="h-6 w-6 text-amber-500 shrink-0" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {celebrity.name}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>{t("cancel")}</Button>
              <Button onClick={handleSave} disabled={updateCelebrity.isPending}>
                {updateCelebrity.isPending ? t("saving") : t("save")}
              </Button>
            </>
          ) : (
            <>
              {activeTab === "info" && (
                <Button variant="outline" size="sm" onClick={startEdit} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                <Trash2 className="h-4 w-4" />
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
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
      {activeTab === "info" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {celebrity.image && !isEditing && (
              <Card>
                <CardContent className="p-4">
                  <img src={celebrity.image} alt={celebrity.name} className="w-full h-64 object-cover rounded-lg" />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("celebrityInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label>{t("name")}</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t("phone")}</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t("email")}</Label>
                        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>{t("image")}</Label>
                      <div className="flex gap-2">
                        <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder={t("imagePlaceholder")} className="flex-1" />
                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                        <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title={t("upload")}>
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
                          <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={(form.audiences || []).includes(a)} onCheckedChange={() => toggleAudience(a)} />
                            {t(`audience_${a}`)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t("dateOfBirth")}</Label>
                        <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t("interests")}</Label>
                        <Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder={t("interestsJsonPlaceholder")} />
                      </div>
                    </div>
                    <div>
                      <Label>{t("tags")}</Label>
                      <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={t("tagsJsonPlaceholder")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t("priceMin")}</Label>
                        <Input type="number" step="0.01" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t("priceMax")}</Label>
                        <Input type="number" step="0.01" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>{t("bio")}</Label>
                      <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label={t("phone")} value={celebrity.phone} />
                      <Field label={t("email")} value={celebrity.email} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("audience")}</p>
                        {celebrity.audiences && celebrity.audiences.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {celebrity.audiences.map((a: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <Users className="h-3 w-3 mr-1" />
                                {t(`audience_${a}` as any) || a}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="font-medium text-slate-900 dark:text-slate-100">—</p>
                        )}
                      </div>
                      <Field label={t("age")} value={celebrity.age} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {celebrity.dateOfBirth && (
                        <Field label={t("dateOfBirth")} value={new Date(celebrity.dateOfBirth).toLocaleDateString()} />
                      )}
                      <Field label={t("image")} value={celebrity.image ? <a href={celebrity.image} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate block max-w-[200px]">{celebrity.image}</a> : null} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("interests")}</p>
                      {celebrity.interests && celebrity.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {celebrity.interests.map((interest: string, idx: number) => (
                            <span key={idx} className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-slate-900 dark:text-slate-100">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("tags")}</p>
                      {celebrity.tags && celebrity.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {celebrity.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-slate-900 dark:text-slate-100">—</p>
                      )}
                    </div>
                    <div>
                      <Field label={t("bio")} value={celebrity.bio} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {isEditing && form.image && (
              <Card>
                <CardContent className="p-4">
                  <img src={form.image} alt="Preview" className="w-full h-48 object-cover rounded-lg" onError={(e) => (e.currentTarget.style.display = "none")} />
                </CardContent>
              </Card>
            )}
            <Card className="bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-100 dark:border-amber-900">
              <CardContent className="p-6 text-center space-y-4">
                <Star className="h-10 w-10 text-amber-500 mx-auto" />
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                    {formatPriceRange() ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("price")}</p>
                </div>
                {celebrity.age != null && (
                  <div className="pt-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-4 w-4" />
                      {celebrity.age} {t("age")}
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {t("createdAt")}: {new Date(celebrity.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Offers */}
      {activeTab === "offers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("offers")}
            </h2>
            <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
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
            <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
              <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>{t("noOffersYet")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(offers as any[]).map((offer: any) => (
                <Card key={offer.id} className="border-border/80">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Megaphone className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{offer.title}</h3>
                        </div>
                        {offer.description && (
                          <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[offer.status] || "bg-slate-100 text-slate-600"}`}>
                          {(t as any)(`offerStatus_${offer.status}`)}
                        </span>
                      </div>
                    </div>

                    {offer.budget != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium" dir="ltr">{Number(offer.budget).toLocaleString()} DZD</span>
                      </div>
                    )}

                    {/* Work details - visible when approved or completed */}
                    {(offer.status === "approved" || offer.status === "completed") && (
                      <div className="border-t border-border/50 pt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          {t("workDetails")}
                        </h4>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t("scenario")}</Label>
                          <Textarea
                            defaultValue={offer.scenario ?? ""}
                            onBlur={(e) => handleUpdateOfferDetail(offer.id, "scenario", e.target.value)}
                            rows={3}
                            className="mt-1"
                            placeholder={t("scenarioPlaceholder")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t("script")}</Label>
                          <Textarea
                            defaultValue={offer.script ?? ""}
                            onBlur={(e) => handleUpdateOfferDetail(offer.id, "script", e.target.value)}
                            rows={3}
                            className="mt-1"
                            placeholder={t("scriptPlaceholder")}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t("idea")}</Label>
                          <Textarea
                            defaultValue={offer.idea ?? ""}
                            onBlur={(e) => handleUpdateOfferDetail(offer.id, "idea", e.target.value)}
                            rows={3}
                            className="mt-1"
                            placeholder={t("offerIdeaPlaceholder")}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                      {offer.status === "pending" && (
                        <>
                          <Button size="sm" variant="default" onClick={() => handleUpdateOfferStatus(offer.id, "approved")} className="gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("approve")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateOfferStatus(offer.id, "rejected")} className="gap-1.5 text-red-600">
                            <X className="h-3.5 w-3.5" />
                            {t("reject")}
                          </Button>
                        </>
                      )}
                      {offer.status === "approved" && (
                        <Button size="sm" variant="default" onClick={() => handleUpdateOfferStatus(offer.id, "completed")} className="gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("complete")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteOffer(offer.id)} className="gap-1.5 text-red-500 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" />
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
