import React, { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useListCelebrities,
  useCreateCelebrity,
  useDeleteCelebrity,
  getListCelebritiesQueryKey,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Star, Phone, Mail, Tag, Users, DollarSign, Trash2, ImageIcon, Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

const AUDIENCE_OPTIONS = ["children", "teens", "youth", "adults", "families", "all"] as const;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Celebrities() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  const { data: celebrities = [], isLoading } = useListCelebrities();
  const createCelebrity = useCreateCelebrity();
  const deleteCelebrity = useDeleteCelebrity();

  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();
  const selectedAudiences = (watch("audiences") || []) as string[];

  const filtered = celebrities.filter((c) => {
    const mSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));
    const mAudience = audienceFilter === "all" || (c.audiences && c.audiences.includes(audienceFilter));
    const mPriceMin = !priceMin || (c.priceMin != null && Number(c.priceMin) <= parseFloat(priceMin)) ||
      (c.priceMax != null && Number(c.priceMax) >= parseFloat(priceMin));
    const mPriceMax = !priceMax || (c.priceMin != null && Number(c.priceMin) <= parseFloat(priceMax)) ||
      (c.priceMax != null && Number(c.priceMax) >= parseFloat(priceMin));
    return mSearch && mAudience && mPriceMin && mPriceMax;
  });

  const resetForm = () => reset();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setValue("image", json.url);
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

  const toggleAudience = (value: string) => {
    const current = selectedAudiences;
    if (current.includes(value)) {
      setValue("audiences", current.filter((v: string) => v !== value));
    } else {
      setValue("audiences", [...current, value]);
    }
  };

  const safeParseJsonArray = (val: string) => {
    if (!val?.trim()) return null;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      return [String(parsed)].filter(Boolean);
    } catch {
      return val.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const res = await createCelebrity.mutateAsync({
        data: {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          image: data.image || null,
          audiences: data.audiences?.length ? data.audiences : null,
          interests: data.interests ? safeParseJsonArray(data.interests) : null,
          dateOfBirth: data.dateOfBirth || null,
          tags: data.tags ? safeParseJsonArray(data.tags) : null,
          priceMin: data.priceMin ? parseFloat(data.priceMin) : null,
          priceMax: data.priceMax ? parseFloat(data.priceMax) : null,
          bio: data.bio || null,
          password: data.password || null,
        },
      }) as any;
      queryClient.invalidateQueries({ queryKey: getListCelebritiesQueryKey() });
      if (res?.loginUsername) {
        setCreatedCredentials({ username: res.loginUsername, password: data.password });
      } else {
        setIsCreateOpen(false);
        resetForm();
        toast({ description: t("celebrityCreated") });
      }
    } catch (err: any) {
      console.error("Create celebrity error:", err);
      const msg = err?.message || err?.error?.error || t("failedToCreateCelebrity");
      toast({ variant: "destructive", description: msg });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteCelebrityConfirm"))) return;
    try {
      await deleteCelebrity.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCelebritiesQueryKey() });
      toast({ description: t("celebrityDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDeleteCelebrity") });
    }
  };

  const formatPriceRange = (c: typeof celebrities[0]) => {
    if (c.priceMin != null && c.priceMax != null) {
      return `${Number(c.priceMin).toLocaleString()} - ${Number(c.priceMax).toLocaleString()} DZD`;
    }
    if (c.priceMin != null) return `${Number(c.priceMin).toLocaleString()}+ DZD`;
    if (c.priceMax != null) return `0 - ${Number(c.priceMax).toLocaleString()} DZD`;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("celebrities")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("celebritiesDesc")}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("newCelebrity")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("newCelebrity")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t("name")} *</Label>
                <Input {...register("name")} placeholder={t("celebrityNamePlaceholder")} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("phone")}</Label>
                  <Input {...register("phone")} placeholder={t("celebrityPhonePlaceholder")} />
                </div>
                <div>
                  <Label>{t("email")}</Label>
                  <Input {...register("email")} placeholder={t("celebrityEmailPlaceholder")} />
                </div>
              </div>
              <div>
                <Label>{t("image")}</Label>
                <div className="flex gap-2">
                  <Input {...register("image")} placeholder={t("imagePlaceholder")} className="flex-1" />
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                  <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title={t("upload")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {watch("image") && (
                  <img src={watch("image")} alt="Preview" className="mt-2 h-32 w-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
              <div>
                <Label>{t("audience")}</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {AUDIENCE_OPTIONS.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedAudiences.includes(a)} onCheckedChange={() => toggleAudience(a)} />
                      {t(`audience_${a}`)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("dateOfBirth")}</Label>
                  <Input {...register("dateOfBirth")} type="date" />
                </div>
                <div>
                  <Label>{t("interests")}</Label>
                  <Input {...register("interests")} placeholder={t("interestsJsonPlaceholder")} />
                </div>
              </div>
              <div>
                <Label>{t("tags")}</Label>
                <Input {...register("tags")} placeholder={t("tagsJsonPlaceholder")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("priceMin")}</Label>
                  <Input {...register("priceMin")} type="number" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <Label>{t("priceMax")}</Label>
                  <Input {...register("priceMax")} type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label>{t("bio")}</Label>
                <Input {...register("bio")} placeholder={t("bioPlaceholder")} />
              </div>

              {createdCredentials ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-800">{t("celebrityPortalAccess")}</p>
                  <div className="text-sm text-green-700 space-y-1">
                    <div><span className="font-medium">{t("usernameLabel")}:</span> <span className="font-mono">{createdCredentials.username}</span></div>
                    <div><span className="font-medium">{t("password")}:</span> <span className="font-mono">{createdCredentials.password}</span></div>
                    <div className="pt-1">
                      <span className="font-medium">{t("celebrityLoginUrl")}:</span>
                      <div className="font-mono text-xs break-all mt-0.5">{window.location.origin}{BASE}/login</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 rounded-xl"
                    onClick={() => {
                      setCreatedCredentials(null);
                      setIsCreateOpen(false);
                      resetForm();
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-t border-border pt-4">
                    <Label className="text-sm font-semibold">{t("celebrityPortalAccess")}</Label>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">{t("passwordCreatesCelebrityLogin")}</Label>
                    <Input
                      {...register("password")}
                      type="password"
                      placeholder={t("setPortalPassword")}
                      className="mt-1 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); setCreatedCredentials(null); }}>
                      {t("cancel")}
                    </Button>
                    <Button type="submit" disabled={createCelebrity.isPending}>
                      {createCelebrity.isPending ? t("creating") : t("create")}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCelebrities")}
            className="ps-9"
          />
        </div>
        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t("audience")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            {AUDIENCE_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>{t(`audience_${a}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t("priceMin")}
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-28"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder={t("priceMax")}
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-28"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>
      ) : !filtered.length ? (
        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
          <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>{t("noCelebritiesYet")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((celebrity, i) => (
            <motion.div
              key={celebrity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/celebrities/${celebrity.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all border-border/80 h-full group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {celebrity.name}
                          </h3>
                        </div>
                        {celebrity.audiences && celebrity.audiences.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {celebrity.audiences.map((a: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <Users className="h-3 w-3 mr-1" />
                                {t(`audience_${a}` as any) || a}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(celebrity.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {celebrity.image && (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span className="truncate text-xs">{celebrity.image}</span>
                        </div>
                      )}
                      {celebrity.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{celebrity.email}</span>
                        </div>
                      )}
                      {celebrity.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          <span dir="ltr">{celebrity.phone}</span>
                        </div>
                      )}
                      {celebrity.age != null && (
                        <div className="flex items-center gap-2">
                          <Star className="h-3.5 w-3.5" />
                          <span>{celebrity.age} {t("age")}</span>
                        </div>
                      )}
                      {formatPriceRange(celebrity) && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="font-medium text-slate-700 dark:text-slate-300" dir="ltr">
                            {formatPriceRange(celebrity)}
                          </span>
                        </div>
                      )}
                    </div>

                    {celebrity.tags && celebrity.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
                        {celebrity.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {celebrity.interests && celebrity.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {celebrity.interests.slice(0, 3).map((interest: string, idx: number) => (
                          <span key={idx} className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                            {interest}
                          </span>
                        ))}
                        {celebrity.interests.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{celebrity.interests.length - 3}</span>
                        )}
                      </div>
                    )}
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
