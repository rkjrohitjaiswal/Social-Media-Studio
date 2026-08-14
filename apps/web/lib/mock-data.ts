export interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  toneVoice: string;
  targetAudience: string;
  guidelines: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  isReference?: boolean;
}

export interface GeneratedAssetVersion {
  id: string;
  versionNumber: number;
  url: string;
  promptUsed: string;
  qualityScore: number;
  qualityReport: {
    lighting: number;
    styleConsistency: number;
    clarity: number;
    brandAlignment: number;
    feedback: string;
  };
  createdAt: string;
}

export interface GeneratedAsset {
  id: string;
  campaignId: string;
  inputAsset: MediaAsset;
  currentVersion: GeneratedAssetVersion;
  versions: GeneratedAssetVersion[];
  caption: {
    text: string;
    cta: string;
    altText: string;
  };
  hashtags: string[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  scheduledTime?: string;
  publishedUrl?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  description: string;
  status: "DRAFT" | "PROCESSING" | "READY_FOR_REVIEW" | "PARTIALLY_APPROVED" | "APPROVED" | "SCHEDULED" | "COMPLETED";
  referenceAsset: MediaAsset;
  inputAssets: MediaAsset[];
  generatedAssets: GeneratedAsset[];
  createdAt: string;
  updatedAt: string;
  progressPercent?: number;
}

export interface ScheduledPost {
  id: string;
  campaignId: string;
  campaignName: string;
  assetUrl: string;
  caption: string;
  platform: "INSTAGRAM";
  scheduledAt: string;
  published: boolean;
  engagement?: {
    likes: number;
    comments: number;
    saves: number;
    reach: number;
  };
}

export const INITIAL_BRANDS: Brand[] = [
  {
    id: "brand-1",
    name: "Maison Lumière",
    logoUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=300&auto=format&fit=crop",
    primaryColor: "#0B0C0E",
    secondaryColor: "#F5F4F0",
    accentColor: "#C5A059",
    toneVoice: "Haute couture, ethereal, minimalist, evocative, effortlessly sophisticated",
    targetAudience: "Discerning luxury consumers, art collectors, high-fashion enthusiasts aged 25-50",
    guidelines: "Prioritize warm cinematic lighting, deep shadows, gold hardware highlights, clean architectural lines. Never use saturated neon tones.",
  },
  {
    id: "brand-2",
    name: "Aura Fine Jewelry",
    logoUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=300&auto=format&fit=crop",
    primaryColor: "#0F1412",
    secondaryColor: "#EBF0ED",
    accentColor: "#D4AF37",
    toneVoice: "Timeless luxury, precious craftsmanship, intimate, elegant",
    targetAudience: "Luxury buyers, wedding clientele, fine jewelry collectors",
    guidelines: "Focus on macro diamond refractions, velvet obsidian surfaces, soft golden hour glows.",
  },
  {
    id: "brand-3",
    name: "Vanguard Atelier",
    logoUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300&auto=format&fit=crop",
    primaryColor: "#121214",
    secondaryColor: "#F0EFF5",
    accentColor: "#A69260",
    toneVoice: "Avant-garde, sculptural, bold editorial, minimalist architecture",
    targetAudience: "Modernist fashion directors, trendsetters, international design aficionados",
    guidelines: "High contrast monochrome paired with champagne accents. Sculptural shadows and geometric framing.",
  }
];

export const MOCK_REFERENCE_ASSETS: MediaAsset[] = [
  {
    id: "ref-1",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop",
    fileName: "reference-couture-golden-hour.jpg",
    mimeType: "image/jpeg",
    width: 1200,
    height: 1500,
    isReference: true,
  },
  {
    id: "ref-2",
    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
    fileName: "reference-minimalist-dramatic-shadows.jpg",
    mimeType: "image/jpeg",
    width: 1200,
    height: 1500,
    isReference: true,
  }
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-101",
    brandId: "brand-1",
    name: "Autumn / Winter 2026 Haute Editorial",
    description: "Anchor reference aesthetic applied across 8 flagship accessories & footwear pieces.",
    status: "READY_FOR_REVIEW",
    createdAt: "2026-08-08T10:00:00Z",
    updatedAt: "2026-08-10T12:30:00Z",
    progressPercent: 100,
    referenceAsset: {
      id: "ref-101",
      url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
      fileName: "reference-haute-couture-mood.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 1500,
      isReference: true,
    },
    inputAssets: [
      {
        id: "in-1",
        url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop",
        fileName: "product-01-leather-clutch.jpg",
        mimeType: "image/jpeg",
        width: 800,
        height: 1000,
      },
      {
        id: "in-2",
        url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
        fileName: "product-02-elixir-bottle.jpg",
        mimeType: "image/jpeg",
        width: 800,
        height: 1000,
      },
      {
        id: "in-3",
        url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop",
        fileName: "product-03-atelier-sunglasses.jpg",
        mimeType: "image/jpeg",
        width: 800,
        height: 1000,
      },
      {
        id: "in-4",
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
        fileName: "product-04-chronograph-gold.jpg",
        mimeType: "image/jpeg",
        width: 800,
        height: 1000,
      }
    ],
    generatedAssets: [
      {
        id: "gen-1",
        campaignId: "camp-101",
        inputAsset: {
          id: "in-1",
          url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop",
          fileName: "product-01-leather-clutch.jpg",
          mimeType: "image/jpeg",
          width: 800,
          height: 1000,
        },
        currentVersion: {
          id: "v1-1",
          versionNumber: 1,
          url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
          promptUsed: "Haute couture editorial scene featuring leather clutch resting on obsidian travertine marble, cinematic warm golden hour side lighting, subtle champagne reflections, high architectural shadow contrast, 8k resolution fashion magazine spread.",
          qualityScore: 96.5,
          qualityReport: {
            lighting: 98,
            styleConsistency: 96,
            clarity: 97,
            brandAlignment: 95,
            feedback: "Exceptional visual harmony with anchor reference. Lighting & texture fidelity are flawless."
          },
          createdAt: "2026-08-10T12:00:00Z",
        },
        versions: [
          {
            id: "v1-1",
            versionNumber: 1,
            url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
            promptUsed: "Haute couture editorial scene featuring leather clutch resting on obsidian travertine marble, cinematic warm golden hour side lighting, subtle champagne reflections, high architectural shadow contrast, 8k resolution fashion magazine spread.",
            qualityScore: 96.5,
            qualityReport: {
              lighting: 98,
              styleConsistency: 96,
              clarity: 97,
              brandAlignment: 95,
              feedback: "Exceptional visual harmony with anchor reference."
            },
            createdAt: "2026-08-10T12:00:00Z",
          }
        ],
        caption: {
          text: "Sculpted in full-grain calfskin with brushed champagne gold accents. A timeless testament to Parisian leathercraft for Autumn / Winter 2026.",
          cta: "Discover the AW26 Leathercraft Capsule via the link in bio.",
          altText: "Black leather luxury handbag resting on dark marble surface bathed in warm golden hour sunlight.",
        },
        hashtags: ["#MaisonLumiere", "#AW26", "#HauteCouture", "#LuxuryLeather", "#ParisianStyle", "#EditorialFashion"],
        status: "APPROVED",
        scheduledTime: "2026-08-12T18:00:00Z",
        createdAt: "2026-08-10T12:00:00Z",
      },
      {
        id: "gen-2",
        campaignId: "camp-101",
        inputAsset: {
          id: "in-2",
          url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
          fileName: "product-02-elixir-bottle.jpg",
          mimeType: "image/jpeg",
          width: 800,
          height: 1000,
        },
        currentVersion: {
          id: "v2-2",
          versionNumber: 2,
          url: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop",
          promptUsed: "Luxury perfume flacon surrounded by soft caressing shadows and warm golden refraction beams, haute couture atmosphere, minimal luxury aesthetic.",
          qualityScore: 94.0,
          qualityReport: {
            lighting: 95,
            styleConsistency: 93,
            clarity: 96,
            brandAlignment: 92,
            feedback: "Regeneration v2 achieved warmer glass refractions matching reference tone."
          },
          createdAt: "2026-08-10T12:15:00Z",
        },
        versions: [
          {
            id: "v2-1",
            versionNumber: 1,
            url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop",
            promptUsed: "Luxury perfume bottle, dark background.",
            qualityScore: 82.0,
            qualityReport: {
              lighting: 80,
              styleConsistency: 81,
              clarity: 85,
              brandAlignment: 82,
              feedback: "Lighting slightly too flat compared to reference."
            },
            createdAt: "2026-08-10T12:05:00Z",
          },
          {
            id: "v2-2",
            versionNumber: 2,
            url: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop",
            promptUsed: "Luxury perfume flacon surrounded by soft caressing shadows and warm golden refraction beams, haute couture atmosphere, minimal luxury aesthetic.",
            qualityScore: 94.0,
            qualityReport: {
              lighting: 95,
              styleConsistency: 93,
              clarity: 96,
              brandAlignment: 92,
              feedback: "Regeneration v2 achieved warmer glass refractions matching reference tone."
            },
            createdAt: "2026-08-10T12:15:00Z",
          }
        ],
        caption: {
          text: "L'Élixir de Nuit: Rare amber iris infused with cedar and warm Madagascar vanilla. Encased in hand-blown smoked crystal.",
          cta: "Reserve your limited edition bottle now.",
          altText: "Smoked glass perfume bottle with gold cap positioned amidst warm light beams and dark shadows.",
        },
        hashtags: ["#MaisonLumiere", "#NicheFragrance", "#HighPerfumery", "#ElixirDeNuit", "#LuxuryBeauty"],
        status: "PENDING",
        createdAt: "2026-08-10T12:05:00Z",
      },
      {
        id: "gen-3",
        campaignId: "camp-101",
        inputAsset: {
          id: "in-3",
          url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop",
          fileName: "product-03-atelier-sunglasses.jpg",
          mimeType: "image/jpeg",
          width: 800,
          height: 1000,
        },
        currentVersion: {
          id: "v3-1",
          versionNumber: 1,
          url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop",
          promptUsed: "Editorial fashion eyewear showcase, hand-carved acetate sunglasses on dark brutalist stone pedestal under warm directional light, high fashion aesthetic.",
          qualityScore: 92.8,
          qualityReport: {
            lighting: 94,
            styleConsistency: 92,
            clarity: 95,
            brandAlignment: 90,
            feedback: "Great material sheen and shadow projection."
          },
          createdAt: "2026-08-10T12:20:00Z",
        },
        versions: [
          {
            id: "v3-1",
            versionNumber: 1,
            url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop",
            promptUsed: "Editorial fashion eyewear showcase, hand-carved acetate sunglasses on dark brutalist stone pedestal under warm directional light, high fashion aesthetic.",
            qualityScore: 92.8,
            qualityReport: {
              lighting: 94,
              styleConsistency: 92,
              clarity: 95,
              brandAlignment: 90,
              feedback: "Great material sheen and shadow projection."
            },
            createdAt: "2026-08-10T12:20:00Z",
          }
        ],
        caption: {
          text: "Architectural silhouette meet japanese titanium hinges. The Obsidian Solis sunglasses defined by understated elegance.",
          cta: "Explore the Eyewear Collection online.",
          altText: "Designer sunglasses resting on raw black stone pedestal in warm light.",
        },
        hashtags: ["#MaisonLumiere", "#LuxuryEyewear", "#FashionAccessories", "#EditorialVisuals"],
        status: "APPROVED",
        scheduledTime: "2026-08-14T15:00:00Z",
        createdAt: "2026-08-10T12:20:00Z",
      },
      {
        id: "gen-4",
        campaignId: "camp-101",
        inputAsset: {
          id: "in-4",
          url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
          fileName: "product-04-chronograph-gold.jpg",
          mimeType: "image/jpeg",
          width: 800,
          height: 1000,
        },
        currentVersion: {
          id: "v4-1",
          versionNumber: 1,
          url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop",
          promptUsed: "Luxury rose gold timepiece resting on dark velvet slate background, warm dramatic side lighting, gold bezel reflections, high luxury magazine photography.",
          qualityScore: 95.2,
          qualityReport: {
            lighting: 97,
            styleConsistency: 94,
            clarity: 96,
            brandAlignment: 94,
            feedback: "Stunning metallic reflection details and depth."
          },
          createdAt: "2026-08-10T12:25:00Z",
        },
        versions: [
          {
            id: "v4-1",
            versionNumber: 1,
            url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop",
            promptUsed: "Luxury rose gold timepiece resting on dark velvet slate background, warm dramatic side lighting, gold bezel reflections, high luxury magazine photography.",
            qualityScore: 95.2,
            qualityReport: {
              lighting: 97,
              styleConsistency: 94,
              clarity: 96,
              brandAlignment: 94,
              feedback: "Stunning metallic reflection details and depth."
            },
            createdAt: "2026-08-10T12:25:00Z",
          }
        ],
        caption: {
          text: "Precision horology handcrafted in Geneva. Featuring a 18k rose gold case with an alligator leather strap.",
          cta: "Book a private boutique appointment.",
          altText: "Rose gold chronograph watch resting on black velvet in warm golden lighting.",
        },
        hashtags: ["#MaisonLumiere", "#GenevaHorology", "#LuxuryWatch", "#Craftsmanship"],
        status: "PENDING",
        createdAt: "2026-08-10T12:25:00Z",
      }
    ]
  },
  {
    id: "camp-102",
    brandId: "brand-2",
    name: "High Jewelry Summer Solstice",
    description: "Macrophotography diamond refractions across 12 high jewelry pieces.",
    status: "PARTIALLY_APPROVED",
    createdAt: "2026-08-05T09:00:00Z",
    updatedAt: "2026-08-09T16:20:00Z",
    progressPercent: 100,
    referenceAsset: {
      id: "ref-102",
      url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop",
      fileName: "reference-diamond-refraction.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 1500,
      isReference: true,
    },
    inputAssets: [],
    generatedAssets: []
  }
];

export const MOCK_SCHEDULED_POSTS: ScheduledPost[] = [
  {
    id: "sched-1",
    campaignId: "camp-101",
    campaignName: "Autumn / Winter 2026 Haute Editorial",
    assetUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    caption: "Sculpted in full-grain calfskin with brushed champagne gold accents. A timeless testament to Parisian leathercraft for Autumn / Winter 2026.",
    platform: "INSTAGRAM",
    scheduledAt: "2026-08-12T18:00:00Z",
    published: false,
  },
  {
    id: "sched-2",
    campaignId: "camp-101",
    campaignName: "Autumn / Winter 2026 Haute Editorial",
    assetUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop",
    caption: "Architectural silhouette meet japanese titanium hinges. The Obsidian Solis sunglasses defined by understated elegance.",
    platform: "INSTAGRAM",
    scheduledAt: "2026-08-14T15:00:00Z",
    published: false,
  },
  {
    id: "sched-3",
    campaignId: "camp-099",
    campaignName: "Spring High Couture 2026",
    assetUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
    caption: "Ethereal drapery captured in the golden lights of Paris.",
    platform: "INSTAGRAM",
    scheduledAt: "2026-08-01T12:00:00Z",
    published: true,
    engagement: {
      likes: 4280,
      comments: 184,
      saves: 950,
      reach: 38400,
    }
  }
];
