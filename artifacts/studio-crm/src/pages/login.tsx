import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useStudio } from "@/lib/use-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Camera, ArrowRight } from "lucide-react";
import { Link } from "wouter";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const { studioName } = useStudio();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginSchema = z.object({
    username: z.string().min(1, t("usernameRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const fillCredentials = (username: string, password: string) => {
    form.setValue("username", username);
    form.setValue("password", password);
    form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      await login({ data });
    } catch (error: any) {
      const msg =
        error?.data?.error ||
        error?.message ||
        t("invalidCredentials");
      toast({
        variant: "destructive",
        title: t("authFailed"),
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FAFAFA]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary to-violet-700 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute top-16 left-12 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute bottom-20 right-8 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full" />
        </div>
        <div className="relative z-10 max-w-sm text-white">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">{studioName}</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight leading-tight mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            {t("heroTitle1")}<br />{t("heroTitle2")}
          </h2>
          <p className="text-white/70 leading-relaxed mb-8">
            {t("heroSubtitle")}
          </p>
          <div className="space-y-3">
            {[t("loginFeature1"), t("loginFeature2"), t("loginFeature3"), t("loginFeature4")].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                <span className="text-white/80">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-white/20">
            <p className="text-xs text-white/50 mb-3">{t("demoCredentials")}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: t("roleAdmin"), user: "admin", pass: "admin123" },
                { role: t("rolePhotographer"), user: "photographer1", pass: "photo123" },
                { role: t("roleClient"), user: "client1", pass: "client123" },
              ].map((cred, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => fillCredentials(cred.user, cred.pass)}
                  className="bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur rounded-xl p-2.5 text-left transition-colors cursor-pointer"
                >
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">{cred.role}</div>
                  <div className="text-xs text-white font-mono">{cred.user}</div>
                  <div className="text-xs text-white/60 font-mono">{cred.pass}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">{studioName}</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-2">{t("welcomeBack")}</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("signInToContinue")}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("username")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("usernamePlaceholder")}
                          className="h-11 rounded-xl border-border bg-slate-50 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 transition-colors text-base"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("password")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("passwordPlaceholder")}
                          className="h-11 rounded-xl border-border bg-slate-50 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 transition-colors text-base"
                          {...field}
                          data-testid="input-password"
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl btn-gradient text-base font-semibold gap-2 mt-2"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("signingIn")}
                    </span>
                  ) : (
                    <>
                      {t("login")}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-6">
            <Link href="/" className="text-primary font-medium hover:underline">{t("backToHomepage")}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
