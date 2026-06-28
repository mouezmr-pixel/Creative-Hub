import React, { useState, useRef, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Star, Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeArray } from "@/lib/utils";
import { CelebrityAvatar } from "@/components/celebrity-avatar";

const AUDIENCE_OPTIONS = ["children", "teens", "youth", "adults", "families", "all"] as const;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#000000",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  snapchat: "#FFFC00",
  facebook: "#1877F2",
};

export default function Celebrities() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  const { data: celebrities = [], isLoading } = useListCelebrities();
  const createCelebrity = useCreateCelebrity();
  const deleteCelebrity = useDeleteCelebrity();

  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();
  const selectedAudiences = (watch("audiences") || []) as string[];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    celebrities.forEach((c) => {
      const tags = normalizeArray(c.tags);
      tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [celebrities]);

  const filtered = useMemo(() => {
    let result = [...celebrities];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((c) => {
        const tags = normalizeArray(c.tags);
        return tags.includes(categoryFilter);
      });
    }

    switch (sortBy) {
      case "priceHigh":
        result.sort((a, b) => (b.priceMax ?? b.priceMin ?? 0) - (a.priceMax ?? a.priceMin ?? 0));
        break;
      case "priceLow":
        result.sort((a, b) => (a.priceMin ?? a.priceMax ?? 0) - (b.priceMin ?? b.priceMax ?? 0));
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [celebrities, search, categoryFilter, sortBy]);

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

  const onSubmit = async (data: any) => {
    try {
      const res = await createCelebrity.mutateAsync({
        data: {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          image: data.image || null,
          audiences: data.audiences?.length ? data.audiences : null,
          interests: data.interests ? normalizeArray(data.interests) : null,
          dateOfBirth: data.dateOfBirth || null,
          tags: data.tags ? normalizeArray(data.tags) : null,
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

  const formatPriceRange = (c: typeof celebrities[0]) => {
    if (c.priceMin != null && c.priceMax != null) {
      return `${Number(c.priceMin).toLocaleString()} \u2013 ${Number(c.priceMax).toLocaleString()} DZD`;
    }
    if (c.priceMin != null) return `${Number(c.priceMin).toLocaleString()}+ DZD`;
    if (c.priceMax != null) return `0 \u2013 ${Number(c.priceMax).toLocaleString()} DZD`;
    return null;
  };

  const getFirstPlatform = (c: typeof celebrities[0]): string | null => {
    if (!c.platforms || !Array.isArray(c.platforms) || c.platforms.length === 0) return null;
    const p = c.platforms[0];
    if (typeof p === "string") return p;
    if (p && typeof p === "object" && "name" in p) return (p as any).name;
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("celebrities")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("celebrityCount").replace("{n}", String(celebrities.length))}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 text-xs h-9 px-3">
              <Plus className="w-3.5 h-3.5" />
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

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchCelebrities")}
            className="ps-8 h-9 text-xs"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-auto min-w-[100px] h-9 text-xs">
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-auto min-w-[110px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="priceHigh">{t("sortPriceHigh")}</SelectItem>
            <SelectItem value="priceLow">{t("sortPriceLow")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-xs">{t("loading")}</div>
      ) : !filtered.length ? (
        <div className="text-center py-12 text-muted-foreground bg-card/30 border border-border">
          <Star className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-xs">{t("noCelebritiesYet")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {filtered.map((celebrity) => {
            const tags = normalizeArray(celebrity.tags);
            const audiences = normalizeArray(celebrity.audiences);
            const interests = normalizeArray(celebrity.interests);
            const platform = getFirstPlatform(celebrity);

            return (
              <Link key={celebrity.id} href={`/celebrities/${celebrity.id}`}>
                <Card className="cursor-pointer hover:border-border-strong transition-all border-border overflow-hidden h-full">
                  <CelebrityAvatar
                    name={celebrity.name}
                    image={celebrity.image}
                    size="full"
                  />
                  <CardContent className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {celebrity.name}
                      </span>
                      <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    </div>

                    {formatPriceRange(celebrity) && (
                      <p className="text-xs font-medium" style={{ color: "#EF9F27" }}>
                        {formatPriceRange(celebrity)}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "#EEEDFE", color: "#534AB7" }}
                        >
                          {tag}
                        </span>
                      ))}
                      {audiences.slice(0, 1).map((a, idx) => (
                        <span
                          key={`a-${idx}`}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "#E1F5EE", color: "#0F6E56" }}
                        >
                          {t(`audience_${a}` as any) || a}
                        </span>
                      ))}
                      {interests.slice(0, 1).map((interest, idx) => (
                        <span
                          key={`i-${idx}`}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "#FBEAF0", color: "#993556" }}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                      {celebrity.age != null && (
                        <>
                          <span>{celebrity.age} {t("age")}</span>
                          {platform && <span className="text-border-strong">·</span>}
                        </>
                      )}
                      {platform && (
                        <span
                          className="truncate"
                          style={{ color: PLATFORM_COLORS[platform.toLowerCase()] || undefined }}
                        >
                          {platform}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}