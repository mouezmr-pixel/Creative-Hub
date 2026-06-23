import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const getAnthropicClient = () => {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseURL || !apiKey) return null;
  return new Anthropic({ baseURL, apiKey });
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  arabic: "Write the entire proposal in Modern Standard Arabic (العربية الفصحى). Use professional, elevated Arabic suitable for a creative studio. Structure it clearly with sections and emojis.",
  algerian: "اكتب المقترح كامل بالدارجة الجزائرية المهنية. استخدم لغة دارجة جزائرية أصيلة وإبداعية تعكس الثقافة الجزائرية. نظّم الأقسام بوضوح مع إيموجيات. مثال للأسلوب المطلوب: بدل 'ما هو' استخدم 'واش'، بدل 'جيد' استخدم 'مزيان'.",
  french: "Write the entire proposal in French (Français). Use professional French suitable for a creative studio. Structure it clearly with sections and emojis.",
  english: "Write the entire proposal in English. Use professional English suitable for a creative studio. Structure it clearly with sections and emojis.",
};

const MOCK_PROPOSALS: Record<string, string> = {
  arabic: `✨ مقترح إبداعي: قصة بصرية سينمائية

نتصور يومك الخاص وقد تحوّل إلى سردية بصرية آسرة. نهجنا يجمع بين:

🎬 **السرد البصري**: تغطية توثيقية تلتقط المشاعر الحقيقية إلى جانب صور موجّهة بعناية.

📸 **اللقطات المميزة**: صور في ضوء الغروب، تفاصيل دقيقة، وتغطية بزاوية واسعة.

🎨 **أسلوب التحرير**: لوح ألوان خالد بدرجات دافئة وناعمة تبقى جميلة لعقود.

📦 **المخرجات**:
- أكثر من 500 صورة عالية الدقة مُحررة بالكامل
- معرض خاص عبر الإنترنت مع إمكانية التنزيل
- ملفات جاهزة للطباعة

هذا المقترح صُمِّم ليتجاوز توقعاتك ويخلق ذكريات تدوم مدى الحياة.`,

  algerian: `✨ مقترح إبداعي: حكاية بالصورة كيما ما شفتيش

راني نتصور ليوم ديالك يتحوّل لحكاية بصرية تهبل. اللي نقدموه هو:

🎬 **التصوير الحي**: نسجّلو كل لحظة حقيقية — الضحكات، الدموع، والمشاعر اللي ما تتكلمش — مزيان.

📸 **اللقطات اللي تبقى**: صور في وقت الغروب، تفاصيل دقيقة، وزوايا واسعة تجيب المشهد كامل.

🎨 **أسلوب التحرير**: ألوان دافية وناعمة — مش مبالغ فيها — تبقى زينة حتى بعد عشرين عام.

📦 **اللي نسلّموه**:
- فوق 500 صورة محررة بالكامل وبجودة عالية
- غاليري خاص على النت مع إمكانية التحميل
- ملفات جاهزة للطباعة

هذا المقترح مصمّم باش يفوق توقعاتك ويخلّي الذكريات تبقى للأبد يا خويا.`,

  french: `✨ Proposition Créative : Une Histoire Visuelle Cinématographique

Nous envisageons votre journée spéciale transformée en un récit visuel saisissant. Notre approche combine :

🎬 **Narration Visuelle**: Une couverture documentaire qui capture les émotions authentiques avec des portraits soigneusement dirigés.

📸 **Photos Signature**: Portraits à l'heure dorée, photographie de détails intimes, et couverture grand angle.

🎨 **Style de Retouche**: Une palette de couleurs intemporelle aux tons doux et chauds.

📦 **Livrables**:
- Plus de 500 images haute résolution entièrement retouchées
- Galerie privée en ligne avec accès au téléchargement
- Fichiers prêts à imprimer

Cette proposition est conçue pour dépasser vos attentes et créer des souvenirs qui durent toute une vie.`,

  english: `✨ Creative Proposal: Cinematic Visual Story

We envision your special day transformed into a breathtaking visual narrative. Our approach combines:

🎬 **Visual Storytelling**: A documentary-style coverage that captures authentic emotions alongside carefully directed portraits.

📸 **Signature Shots**: Golden-hour portraits, intimate detail photography, and dramatic wide-angle coverage.

🎨 **Editing Style**: A timeless color palette with soft, warm tones that will look beautiful for decades to come.

📦 **Deliverables**:
- 500+ curated, fully-edited high-resolution images
- Private online gallery with download access
- Print-ready files with personal use license

This proposal is crafted to exceed your expectations and create memories that last a lifetime.`,
};

router.post("/ai/enhance-proposal", async (req, res): Promise<void> => {
  const sessionData = req.session as unknown as Record<string, unknown>;
  if (!sessionData.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { originalIdea, instructions, language = "english" } = req.body as {
    originalIdea?: string;
    instructions?: string;
    language?: string;
  };

  if (!originalIdea || !originalIdea.trim()) {
    res.status(400).json({ error: "originalIdea is required" });
    return;
  }

  const langKey = (language || "english").toLowerCase();
  const langInstruction = LANGUAGE_INSTRUCTIONS[langKey] ?? LANGUAGE_INSTRUCTIONS.english;
  const mockProposal = MOCK_PROPOSALS[langKey] ?? MOCK_PROPOSALS.english;

  const anthropic = getAnthropicClient();

  if (!anthropic) {
    res.json({ proposal: mockProposal });
    return;
  }

  try {
    const systemPrompt = `You are an expert creative studio consultant specializing in photography and videography.
Your task is to transform a client's rough idea into a polished, professional creative proposal.
Write in a warm, professional tone. Use clear sections with emojis for readability.
Include: visual style, key shots/moments to capture, editing approach, and deliverables overview.
Keep the proposal concise but compelling — around 200-300 words.
CRITICAL LANGUAGE RULE: ${langInstruction}
You MUST write the ENTIRE response in the specified language. Do NOT mix languages.`;

    const userPrompt = `Client's original idea: "${originalIdea}"${instructions ? `\n\nAdditional style/instructions: "${instructions}"` : ""}

Please create a professional creative proposal based on this. Remember: write ENTIRELY in the requested language only.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const content = message.content[0];
    const proposal = content.type === "text" ? content.text : mockProposal;
    res.json({ proposal });
  } catch {
    res.json({ proposal: mockProposal });
  }
});

export default router;
