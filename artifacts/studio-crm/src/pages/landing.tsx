import React from "react";
import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import {
  Camera,
  Users,
  TrendingUp,
  Globe,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  Star,
  BarChart3,
  MessageSquare,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { useStudio } from "@/lib/use-studio";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

function DashboardMockup() {
  const { t } = useLanguage();
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xl overflow-hidden">
      <div className="flex h-[380px]">
        <div className="w-14 bg-slate-50 dark:bg-slate-800 border-r border-border flex flex-col items-center py-4 gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          {[BarChart3, Users, Camera, Globe].map((Icon, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-primary" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800"}`}>
              <Icon className={`w-4 h-4 ${i === 0 ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />
            </div>
          ))}
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-3 w-24 bg-slate-200 rounded-full mb-1.5" />
              <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-lg bg-primary/10 border border-primary/20" />
              <div className="h-7 w-7 rounded-lg bg-primary" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: t("totalRevenue"), value: "$48.2K", color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: t("totalCollected"), value: "$36.5K", color: "text-blue-600", bg: "bg-blue-50" },
              { label: t("totalDebt"), value: "$11.7K", color: "text-rose-600", bg: "bg-rose-50" },
              { label: t("ongoing"), value: "24", color: "text-violet-600", bg: "bg-violet-50" },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-border shadow-sm">
                <div className={`text-xs font-medium mb-1 ${color_from(stat.color, 'text-slate-400 dark:text-slate-500')}`}>{stat.label}</div>
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className={`mt-1 h-1 rounded-full ${stat.bg}`} />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-3">
            <div className="flex items-center gap-2 mb-3">
              {[t("all"), t("ongoing"), t("completed"), t("debtList")].map((tab, i) => (
                <div key={i} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${i === 0 ? "bg-primary text-white" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>{tab}</div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { name: "Wedding Laroche", client: "Marie Laroche", progress: 85, debt: false },
                { name: "Corporate Headshots", client: "TechCorp Inc.", progress: 40, debt: true },
                { name: "Family Portraits", client: "Ahmed Family", progress: 100, debt: false },
              ].map((project, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${project.debt ? "border-rose-200 dark:border-rose-800 bg-rose-50/50" : "border-border"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{project.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{project.client}</div>
                  </div>
                  <div className="w-20">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400 dark:text-slate-500">{t("progressLabel")}</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div className={`h-full rounded-full ${project.progress === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${project.debt ? "bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400" : project.progress === 100 ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400" : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"}`}>
                    {project.debt ? t("debtList") : project.progress === 100 ? t("completed") : t("ongoing")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function color_from(c: string, fallback: string) {
  return fallback;
}

const features: {
  icon: React.ComponentType<any>;
  tKey: TranslationKey;
  tDescKey: TranslationKey;
  color: string;
  iconColor: string;
  size: string;
  wide?: boolean;
}[] = [
  {
    icon: Camera,
    tKey: "featureProjectPipeline",
    tDescKey: "featureProjectPipelineDesc",
    color: "bg-violet-50",
    iconColor: "text-violet-600",
    size: "col-span-1",
  },
  {
    icon: TrendingUp,
    tKey: "featureFinancialDashboard",
    tDescKey: "featureFinancialDashboardDesc",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
    size: "col-span-1",
  },
  {
    icon: Users,
    tKey: "featureMultiRole",
    tDescKey: "featureMultiRoleDesc",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    size: "col-span-2",
    wide: true,
  },
  {
    icon: Globe,
    tKey: "featureMultiLanguage",
    tDescKey: "featureMultiLanguageDesc",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
    size: "col-span-1",
  },
  {
    icon: MessageSquare,
    tKey: "featureClientMessaging",
    tDescKey: "featureClientMessagingDesc",
    color: "bg-pink-50",
    iconColor: "text-pink-600",
    size: "col-span-1",
  },
  {
    icon: Layers,
    tKey: "featureWeTransfer",
    tDescKey: "featureWeTransferDesc",
    color: "bg-indigo-50",
    iconColor: "text-indigo-600",
    size: "col-span-1",
  },
  {
    icon: Shield,
    tKey: "featureSecurity",
    tDescKey: "featureSecurityDesc",
    color: "bg-slate-50",
    iconColor: "text-slate-600",
    size: "col-span-1",
  },
];

const plans: {
  nameKey: TranslationKey;
  price: string;
  descKey: TranslationKey;
  featureKeys: TranslationKey[];
  ctaKey: TranslationKey;
  featured: boolean;
}[] = [
  {
    nameKey: "pricingFree",
    price: "0",
    descKey: "pricingFreeDesc",
    featureKeys: ["featFree1", "featFree2", "featFree3", "featFree4"],
    ctaKey: "pricingFreeCta",
    featured: false,
  },
  {
    nameKey: "pricingPro",
    price: "29",
    descKey: "pricingProDesc",
    featureKeys: ["featPro1", "featPro2", "featPro3", "featPro4", "featPro5", "featPro6"],
    ctaKey: "pricingProCta",
    featured: true,
  },
  {
    nameKey: "pricingAgency",
    price: "79",
    descKey: "pricingAgencyDesc",
    featureKeys: ["featAgency1", "featAgency2", "featAgency3", "featAgency4", "featAgency5", "featAgency6"],
    ctaKey: "pricingAgencyCta",
    featured: false,
  },
];

export default function Landing() {
  const { t } = useLanguage();
  const { studioName } = useStudio();
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">{studioName}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            <a href="#features" className="hover:text-primary transition-colors">{t("featuresNav")}</a>
            <a href="#pricing" className="hover:text-primary transition-colors">{t("pricingNav")}</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium">{t("login")}</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="btn-gradient font-medium">{t("heroCta")} →</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-[10%] w-96 h-96 rounded-full bg-primary/8 blur-[80px]" />
          <div className="absolute top-40 right-[5%] w-80 h-80 rounded-full bg-violet-400/8 blur-[80px]" />
          <div className="absolute bottom-0 left-[40%] w-96 h-64 rounded-full bg-pink-400/6 blur-[80px]" />
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 px-4 py-1.5 text-sm font-medium rounded-full">
              <Zap className="w-3.5 h-3.5 mr-1.5 inline" />
              {t("heroBadge")}
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {t("heroTitle1")}
            <span className="gradient-text">{t("heroTitle2")}</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-xl text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t("heroSubtitle")}
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/login">
              <Button size="lg" className="btn-gradient h-13 px-8 text-base font-semibold rounded-xl gap-2">
                {t("heroCta")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 text-base font-semibold rounded-xl bg-white dark:bg-slate-900 border-border shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
              >
                {t("heroSecondaryCta")}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="relative max-w-4xl mx-auto"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="relative">
              <DashboardMockup />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-black/5 blur-xl rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 px-6 border-y border-border bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {[t("socialProof1"), t("socialProof2"), t("socialProof3"), t("socialProof4")].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-medium">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 rounded-full px-4 py-1.5 font-medium">
              {t("featuresBadge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {t("featuresTitle")}
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-2xl mx-auto">
              {t("featuresSubtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.5}
                className={`bento-card p-6 ${feature.wide ? "md:col-span-2" : ""}`}
              >
                <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight">{t(feature.tKey)}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">{t(feature.tDescKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white dark:bg-slate-900 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 rounded-full px-4 py-1.5 font-medium">
              {t("pricingBadge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {t("pricingTitle")}
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("pricingSubtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.5}
                className={`relative rounded-2xl p-8 ${plan.featured
                  ? "bg-primary text-white shadow-xl shadow-primary/25 scale-105"
                  : "bg-white border border-border shadow-sm"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-white dark:bg-slate-900 text-primary text-xs font-bold px-4 py-1.5 rounded-full shadow-sm border border-primary/20">
                      {t("mostPopular")}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-1 ${plan.featured ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>{t(plan.nameKey)}</h3>
                  <p className={`text-sm mb-4 ${plan.featured ? "text-white/70" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>{t(plan.descKey)}</p>
                  <div className="flex items-end gap-1">
                    <span className={`text-5xl font-black tracking-tight ${plan.featured ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>${plan.price}</span>
                    <span className={`text-sm mb-2 ${plan.featured ? "text-white/70" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>{t("pricingPerMonth")}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.featureKeys.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.featured ? "text-white/80" : "text-primary"}`} />
                      <span className={plan.featured ? "text-white/90" : "text-slate-600"}>{t(f)}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button
                    className={`w-full rounded-xl font-semibold ${plan.featured
                      ? "bg-white text-primary hover:bg-white/90"
                      : "btn-gradient"
                    }`}
                  >
                    {t(plan.ctaKey)}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative bg-gradient-to-br from-primary to-violet-600 rounded-3xl p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative z-10">
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {t("ctaTitle")}
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                {t("ctaSubtitle")}
              </p>
              <Link href="/login">
                <Button size="lg" className="bg-white dark:bg-slate-900 text-primary hover:bg-white/90 font-bold px-10 rounded-xl h-13 text-base gap-2">
                  {t("ctaButton")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white dark:bg-slate-900 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">{studioName}</span>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("footerCopyright")}</p>
          <Link href="/login">
            <Button variant="outline" size="sm" className="rounded-lg font-medium">{t("login")}</Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}
