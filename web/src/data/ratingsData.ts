import { BrandId, RatingReview, RatingSummary } from '../types';

export const RATINGS_STORAGE_KEY = 'sudan_phones_ratings_v2';

/**
 * Normalizes a phone model key so ratings are linked strictly to the specific phone model
 * (e.g. "apple::iphone 15 pro max", "samsung::galaxy s24 ultra") rather than a single store
 * listing or an entire brand. Any store selling that phone model automatically shares this rating.
 */
export function getPhoneModelRatingKey(brand: BrandId, model: string): string {
  return `${brand}::${model.trim().toLowerCase()}`;
}

/**
 * Seeded reviews for verified stores and specific catalog phone models.
 */
export const INITIAL_RATING_REVIEWS: RatingReview[] = [
  // === Store Ratings (Per Store) ===
  {
    id: 'rev-st-nile-1',
    targetType: 'store',
    targetId: 'store-nile',
    authorName: 'عمر الفاروق',
    rating: 5,
    comment: 'تعامل راقٍ جداً وفحصوا معي الجهاز بكل شفافية قبل الشراء.',
    createdAt: '2026-11-18',
  },
  {
    id: 'rev-st-nile-2',
    targetType: 'store',
    targetId: 'store-nile',
    authorName: 'سارة عبد الله',
    rating: 5,
    comment: 'الضمان حقيقي والأسعار مطابقة لما هو معروض في التطبيق.',
    createdAt: '2026-11-15',
  },
  {
    id: 'rev-st-nile-3',
    targetType: 'store',
    targetId: 'store-nile',
    authorName: 'Mohammed Hassan',
    rating: 4,
    comment: 'Fast response on WhatsApp and original sealed box.',
    createdAt: '2026-11-11',
  },
  {
    id: 'rev-st-redsea-1',
    targetType: 'store',
    targetId: 'store-redsea',
    authorName: 'طارق عثمان',
    rating: 5,
    comment: 'أفضل أسعار في بورتسودان وخدمة ما بعد البيع ممتازة.',
    createdAt: '2026-11-17',
  },
  {
    id: 'rev-st-redsea-2',
    targetType: 'store',
    targetId: 'store-redsea',
    authorName: 'لينا الصادق',
    rating: 4,
    comment: 'متجر مرتب جداً وموظفين متعاونين.',
    createdAt: '2026-11-12',
  },
  {
    id: 'rev-st-khartoum-1',
    targetType: 'store',
    targetId: 'store-khartoum',
    authorName: 'خالد محجوب',
    rating: 5,
    comment: 'تشكيلة ممتازة من الأجهزة الجديدة والمستعملة النظيفة.',
    createdAt: '2026-11-16',
  },
  {
    id: 'rev-st-khartoum-2',
    targetType: 'store',
    targetId: 'store-khartoum',
    authorName: 'Amina Babiker',
    rating: 5,
    comment: 'Honest battery health disclosure and clear invoice.',
    createdAt: '2026-11-10',
  },
  {
    id: 'rev-st-khartoum-3',
    targetType: 'store',
    targetId: 'store-khartoum',
    authorName: 'مازن التوم',
    rating: 4,
    comment: 'جهاز ممتاز بس زحمة شوية وقت المساء.',
    createdAt: '2026-11-08',
  },
  {
    id: 'rev-st-omdurman-1',
    targetType: 'store',
    targetId: 'store-omdurman',
    authorName: 'وليد بابكر',
    rating: 5,
    comment: 'مصداقية عالية جداً في وصف الأجهزة المستعملة.',
    createdAt: '2026-11-14',
  },
  {
    id: 'rev-st-omdurman-2',
    targetType: 'store',
    targetId: 'store-omdurman',
    authorName: 'مروة إبراهيم',
    rating: 4,
    comment: 'أسعار مناسبة واستجابة سريعة.',
    createdAt: '2026-11-09',
  },

  // === Specific Phone Model Ratings (Shared Across Every Store Carrying That Model) ===
  // Samsung Galaxy S24 Ultra
  {
    id: 'rev-pm-s24u-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('samsung', 'Galaxy S24 Ultra'),
    authorName: 'أنس ميرغني',
    rating: 5,
    comment: 'كاميرا 200MP وزوم خرافي وشاشة مقاومة للانعكاس ممتازة في الشمس.',
    createdAt: '2026-11-19',
  },
  {
    id: 'rev-pm-s24u-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('samsung', 'Galaxy S24 Ultra'),
    authorName: 'Kareem Salah',
    rating: 5,
    comment: 'S-Pen, titanium frame, and Snapdragon 8 Gen 3 performance are unmatched.',
    createdAt: '2026-11-15',
  },
  {
    id: 'rev-pm-s24u-3',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('samsung', 'Galaxy S24 Ultra'),
    authorName: 'رهام نور الدين',
    rating: 5,
    comment: 'بطارية ممتازة وتصوير ليلي واضح جداً.',
    createdAt: '2026-11-11',
  },

  // Samsung Galaxy A55 5G
  {
    id: 'rev-pm-a55-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('samsung', 'Galaxy A55 5G'),
    authorName: 'معاذ الطيب',
    rating: 5,
    comment: 'إطار ألومنيوم فخم ومقاومة ماء IP67 بسعر متوسط ممتاز.',
    createdAt: '2026-11-18',
  },
  {
    id: 'rev-pm-a55-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('samsung', 'Galaxy A55 5G'),
    authorName: 'Salma Omer',
    rating: 4,
    comment: 'Great Super AMOLED 120Hz screen and microSD slot; charging is 25W.',
    createdAt: '2026-11-12',
  },

  // Apple iPhone 15 Pro Max
  {
    id: 'rev-pm-15pm-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('apple', 'iPhone 15 Pro Max'),
    authorName: 'يوسف الطيب',
    rating: 5,
    comment: 'وزن التيتانيوم أخف بكثير ومنفذ Type-C وتصوير 4K ProRes مذهل.',
    createdAt: '2026-11-19',
  },
  {
    id: 'rev-pm-15pm-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('apple', 'iPhone 15 Pro Max'),
    authorName: 'Nadia Ali',
    rating: 5,
    comment: 'Best video camera and smooth 120Hz display, battery lasts all day.',
    createdAt: '2026-11-14',
  },
  {
    id: 'rev-pm-15pm-3',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('apple', 'iPhone 15 Pro Max'),
    authorName: 'هشام دفع الله',
    rating: 4,
    comment: 'جهاز قوي جداً لكن الشحن السلكي أبطأ من بعض أجهزة أندرويد.',
    createdAt: '2026-11-09',
  },

  // Apple iPhone 13 Pro
  {
    id: 'rev-pm-13p-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('apple', 'iPhone 13 Pro'),
    authorName: 'تسنيم علي',
    rating: 5,
    comment: 'ما زال ممتاز جداً وشاشة 120Hz وكاميرا احترافية بسعر اقتصادي مقارنة بالجديد.',
    createdAt: '2026-11-16',
  },
  {
    id: 'rev-pm-13p-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('apple', 'iPhone 13 Pro'),
    authorName: 'Hassan Idris',
    rating: 4,
    comment: 'Compact flagship size and great build; Lightning port feels slightly dated.',
    createdAt: '2026-11-10',
  },

  // Xiaomi Redmi Note 13 Pro+
  {
    id: 'rev-pm-rn13pp-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('xiaomi', 'Redmi Note 13 Pro+'),
    authorName: 'مصطفى كمال',
    rating: 5,
    comment: 'شحن 120W يشحن الهاتف بالكامل في أقل من 25 دقيقة ومقاومة ماء IP68.',
    createdAt: '2026-11-17',
  },
  {
    id: 'rev-pm-rn13pp-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('xiaomi', 'Redmi Note 13 Pro+'),
    authorName: 'منى عوض',
    rating: 4,
    comment: 'شاشة منحنية جميلة وكاميرا 200MP ممتازة مقابل السعر.',
    createdAt: '2026-11-11',
  },

  // Google Pixel 8 Pro
  {
    id: 'rev-pm-p8p-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('google', 'Pixel 8 Pro'),
    authorName: 'أحمد بشير',
    rating: 5,
    comment: 'أفضل تجربة تصوير فوتوغرافي وتحديثات أندرويد مباشرة من جوجل.',
    createdAt: '2026-11-16',
  },
  {
    id: 'rev-pm-p8p-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('google', 'Pixel 8 Pro'),
    authorName: 'Dina Osman',
    rating: 4,
    comment: 'Super clean OS and bright Super Actua screen.',
    createdAt: '2026-11-10',
  },

  // OnePlus 12
  {
    id: 'rev-pm-op12-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('oneplus', 'OnePlus 12'),
    authorName: 'عمار جلال',
    rating: 5,
    comment: 'بطارية 5400mAh وشحن 100W وسرعة استجابة خيالية مع Snapdragon 8 Gen 3.',
    createdAt: '2026-11-17',
  },
  {
    id: 'rev-pm-op12-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('oneplus', 'OnePlus 12'),
    authorName: 'Huda Mansour',
    rating: 5,
    comment: 'Incredible display smoothness and 50W wireless charging.',
    createdAt: '2026-11-12',
  },

  // Tecno Camon 30 Pro 5G
  {
    id: 'rev-pm-c30p-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('tecno', 'Camon 30 Pro 5G'),
    authorName: 'أمل يوسف',
    rating: 5,
    comment: 'شاشة 144Hz وكاميرا سيلفي 50MP مع شحن 70W ممتازة جداً في فئتها.',
    createdAt: '2026-11-15',
  },
  {
    id: 'rev-pm-c30p-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('tecno', 'Camon 30 Pro 5G'),
    authorName: 'سيف الدين حامد',
    rating: 4,
    comment: 'أداء قوي في الألعاب وتصوير ليلي جيد جداً.',
    createdAt: '2026-11-08',
  },

  // Infinix Note 40 Pro
  {
    id: 'rev-pm-n40p-1',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('infinix', 'Note 40 Pro'),
    authorName: 'بكري الصادق',
    rating: 4,
    comment: 'شحن لاسلكي 20W وشاشة منحنية أنيقة بسعر اقتصادي ممتاز.',
    createdAt: '2026-11-14',
  },
  {
    id: 'rev-pm-n40p-2',
    targetType: 'phone_model',
    targetId: getPhoneModelRatingKey('infinix', 'Note 40 Pro'),
    authorName: 'Rami Taha',
    rating: 4,
    comment: 'Great value package with fast 70W wired charging; 4G only.',
    createdAt: '2026-11-09',
  },
];

export function computeRatingSummary(
  allReviews: RatingReview[],
  targetType: 'store' | 'phone_model',
  targetId: string
): RatingSummary {
  const matched = allReviews.filter(
    (r) => r.targetType === targetType && r.targetId === targetId
  );
  const breakdown: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;

  for (const r of matched) {
    const clamped = Math.min(5, Math.max(1, Math.round(r.rating)));
    sum += clamped;
    breakdown[5 - clamped] += 1;
  }

  const count = matched.length;
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

  return {
    average,
    count,
    breakdown,
    reviews: matched,
  };
}

export function loadInitialReviews(): RatingReview[] {
  if (typeof window === 'undefined') return INITIAL_RATING_REVIEWS;
  try {
    const raw = window.localStorage.getItem(RATINGS_STORAGE_KEY);
    if (!raw) return INITIAL_RATING_REVIEWS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_RATING_REVIEWS;
    return parsed as RatingReview[];
  } catch {
    return INITIAL_RATING_REVIEWS;
  }
}
