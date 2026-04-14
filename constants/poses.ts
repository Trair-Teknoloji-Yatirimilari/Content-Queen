/**
 * Content Queen — Hazır Poz Kataloğu
 * AI ile üretilmiş, telif sorunu olmayan referans pozlar.
 */

export interface PoseCategory {
  id: string;
  name: string;
  emoji: string;
  poses: Pose[];
}

export interface Pose {
  id: string;
  imageUrl: string;
  label: string;
}

const B = "https://gfboaewsiiasymqunnxm.supabase.co/storage/v1/object/public/content-queen/poses";

export const POSE_CATEGORIES: PoseCategory[] = [
  {
    id: "travel",
    name: "Seyahat",
    emoji: "✈️",
    poses: [
      { id: "paris", imageUrl: `${B}/paris.webp`, label: "Paris" },
      { id: "milano", imageUrl: `${B}/milano.webp`, label: "Milano" },
      { id: "istanbul", imageUrl: `${B}/istanbul.webp`, label: "İstanbul" },
    ],
  },
  {
    id: "fashion",
    name: "Moda & Çanta",
    emoji: "👜",
    poses: [
      { id: "hermes-bag", imageUrl: `${B}/hermes-bag.webp`, label: "Street Style" },
      { id: "shopping", imageUrl: `${B}/shopping.webp`, label: "Shopping" },
      { id: "cafe", imageUrl: `${B}/cafe.webp`, label: "Café Chic" },
    ],
  },
  {
    id: "party",
    name: "Parti & Gece",
    emoji: "🥂",
    poses: [
      { id: "rooftop-party", imageUrl: `${B}/rooftop-party.webp`, label: "Rooftop" },
      { id: "nightclub", imageUrl: `${B}/nightclub.webp`, label: "VIP Club" },
      { id: "red-carpet", imageUrl: `${B}/red-carpet.webp`, label: "Red Carpet" },
      { id: "concert", imageUrl: `${B}/concert.webp`, label: "Festival" },
    ],
  },
  {
    id: "luxury",
    name: "Lüks Yaşam",
    emoji: "💎",
    poses: [
      { id: "hotel", imageUrl: `${B}/hotel.webp`, label: "Hotel Suite" },
      { id: "luxury-car", imageUrl: `${B}/luxury-car.webp`, label: "Luxury Car" },
      { id: "yacht", imageUrl: `${B}/yacht.webp`, label: "Yacht" },
      { id: "restaurant", imageUrl: `${B}/restaurant.webp`, label: "Fine Dining" },
    ],
  },
  {
    id: "lifestyle",
    name: "Yaşam Tarzı",
    emoji: "🌿",
    poses: [
      { id: "beach", imageUrl: `${B}/beach.webp`, label: "Beach" },
      { id: "garden", imageUrl: `${B}/garden.webp`, label: "Garden Party" },
      { id: "spa", imageUrl: `${B}/spa.webp`, label: "Spa & Wellness" },
      { id: "gym", imageUrl: `${B}/gym.webp`, label: "Fitness" },
      { id: "ski", imageUrl: `${B}/ski.webp`, label: "Ski Resort" },
      { id: "business", imageUrl: `${B}/business.webp`, label: "Business" },
    ],
  },
];
