/**
 * Content Queen — Görsel Stilleri
 * Her stil farklı prompt, guidance ve parametrelerle çalışır.
 */

export interface ImageStyle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  prompt: string;
  guidance: number;
  steps: number;
}

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: "professional",
    name: "Profesyonel",
    emoji: "💼",
    description: "İş dünyası, LinkedIn, kurumsal profil",
    prompt: "professional corporate photography, clean background, studio lighting, sharp focus, business attire, confident pose, high-end magazine quality, 8k",
    guidance: 3.5,
    steps: 30,
  },
  {
    id: "natural",
    name: "Doğal",
    emoji: "🌿",
    description: "Günlük, samimi, doğal ışık",
    prompt: "natural candid photography, soft golden hour lighting, warm tones, authentic expression, lifestyle photography, bokeh background, film grain, 8k",
    guidance: 3.0,
    steps: 28,
  },
  {
    id: "fashion",
    name: "Moda",
    emoji: "👗",
    description: "Moda çekimi, editorial, stil",
    prompt: "high fashion editorial photography, dramatic lighting, vogue magazine style, stylish pose, fashion model look, designer aesthetic, cinematic color grading, 8k",
    guidance: 4.0,
    steps: 32,
  },
  {
    id: "social",
    name: "Sosyal Medya",
    emoji: "📱",
    description: "Instagram, TikTok, influencer",
    prompt: "instagram influencer photography, trendy aesthetic, perfect lighting, vibrant colors, social media ready, aspirational lifestyle, clean composition, 8k",
    guidance: 3.5,
    steps: 28,
  },
  {
    id: "artistic",
    name: "Sanatsal",
    emoji: "🎨",
    description: "Yaratıcı, sanatsal, benzersiz",
    prompt: "artistic portrait photography, creative lighting, dramatic shadows, fine art aesthetic, museum quality, unique composition, moody atmosphere, 8k",
    guidance: 4.5,
    steps: 35,
  },
  {
    id: "glamour",
    name: "Glamour",
    emoji: "✨",
    description: "Işıltılı, göz alıcı, red carpet",
    prompt: "glamour photography, perfect skin, radiant glow, luxury aesthetic, red carpet ready, beauty retouching style, flawless lighting, magazine cover quality, 8k",
    guidance: 3.5,
    steps: 30,
  },
];

export function getStyleById(id: string): ImageStyle {
  return IMAGE_STYLES.find((s) => s.id === id) || IMAGE_STYLES[0];
}
