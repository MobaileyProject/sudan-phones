import {
  BilingualText,
  BrandId,
  CityId,
  DeviceCondition,
  Language,
  PublicationStatus,
  StoreStaffRole,
  UsedAvailability,
  UsedGrade,
  VerificationStatus,
} from '../types';

export const CITIES: { id: CityId; name: BilingualText; region: BilingualText }[] = [
  {
    id: 'khartoum',
    name: { ar: 'ولاية الخرطوم', en: 'Khartoum State' },
    region: { ar: 'الخرطوم', en: 'Khartoum' },
  },
  {
    id: 'port_sudan',
    name: { ar: 'ولاية البحر الأحمر (بورتسودان)', en: 'Red Sea (Port Sudan)' },
    region: { ar: 'بورتسودان', en: 'Port Sudan' },
  },
  {
    id: 'omdurman',
    name: { ar: 'أم درمان (ولاية الخرطوم)', en: 'Omdurman (Khartoum)' },
    region: { ar: 'ولاية الخرطوم', en: 'Khartoum State' },
  },
  {
    id: 'al_jazirah',
    name: { ar: 'ولاية الجزيرة (ود مدني)', en: 'Al Jazirah (Wad Madani)' },
    region: { ar: 'ود مدني', en: 'Wad Madani' },
  },
  {
    id: 'river_nile',
    name: { ar: 'ولاية نهر النيل (عطبرة / الدامر)', en: 'River Nile (Atbara / Ed Damer)' },
    region: { ar: 'الدامر · عطبرة', en: 'Ed Damer · Atbara' },
  },
  {
    id: 'northern',
    name: { ar: 'الولاية الشمالية (دنقلا)', en: 'Northern State (Dongola)' },
    region: { ar: 'دنقلا', en: 'Dongola' },
  },
  {
    id: 'kassala',
    name: { ar: 'ولاية كسلا', en: 'Kassala State' },
    region: { ar: 'كسلا', en: 'Kassala' },
  },
  {
    id: 'gedaref',
    name: { ar: 'ولاية القضارف', en: 'Al Qadarif (Gedaref)' },
    region: { ar: 'القضارف', en: 'Gedaref' },
  },
  {
    id: 'sennar',
    name: { ar: 'ولاية سنار (سنجة)', en: 'Sennar State (Singa)' },
    region: { ar: 'سنجة · سنار', en: 'Singa · Sennar' },
  },
  {
    id: 'white_nile',
    name: { ar: 'ولاية النيل الأبيض (كوستي / ربك)', en: 'White Nile (Kosti / Rabak)' },
    region: { ar: 'ربك · كوستي', en: 'Rabak · Kosti' },
  },
  {
    id: 'blue_nile',
    name: { ar: 'ولاية النيل الأزرق (الدمازين)', en: 'Blue Nile (Ad-Damazin)' },
    region: { ar: 'الدمازين', en: 'Ad-Damazin' },
  },
  {
    id: 'north_kordofan',
    name: { ar: 'ولاية شمال كردفان (الأبيض)', en: 'North Kordofan (El-Obeid)' },
    region: { ar: 'الأبيض', en: 'El-Obeid' },
  },
  {
    id: 'south_kordofan',
    name: { ar: 'ولاية جنوب كردفان (كادوقلي)', en: 'South Kordofan (Kadugli)' },
    region: { ar: 'كادوقلي', en: 'Kadugli' },
  },
  {
    id: 'west_kordofan',
    name: { ar: 'ولاية غرب كردفان (الفولة)', en: 'West Kordofan (Al-Fulah)' },
    region: { ar: 'الفولة', en: 'Al-Fulah' },
  },
  {
    id: 'north_darfur',
    name: { ar: 'ولاية شمال دارفور (الفاشر)', en: 'North Darfur (El Fasher)' },
    region: { ar: 'الفاشر', en: 'El Fasher' },
  },
  {
    id: 'south_darfur',
    name: { ar: 'ولاية جنوب دارفور (نيالا)', en: 'South Darfur (Nyala)' },
    region: { ar: 'نيالا', en: 'Nyala' },
  },
  {
    id: 'west_darfur',
    name: { ar: 'ولاية غرب دارفور (الجنينة)', en: 'West Darfur (Geneina)' },
    region: { ar: 'الجنينة', en: 'Geneina' },
  },
  {
    id: 'central_darfur',
    name: { ar: 'ولاية وسط دارفور (زالنجي)', en: 'Central Darfur (Zalingei)' },
    region: { ar: 'زالنجي', en: 'Zalingei' },
  },
  {
    id: 'east_darfur',
    name: { ar: 'ولاية شرق دارفور (الضعين)', en: 'East Darfur (Ed Daein)' },
    region: { ar: 'الضعين', en: 'Ed Daein' },
  },
];

export interface CountryDialCode {
  code: string;
  iso: string;
  name: BilingualText;
  placeholder: string;
  minDigits: number;
  maxDigits: number;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: '+249', iso: 'SD', name: { ar: 'السودان', en: 'Sudan' }, placeholder: '91 234 5678', minDigits: 9, maxDigits: 9 },
];

export const BRANDS: { id: BrandId; label: string; arLabel: string; origin: string }[] = [
  { id: 'apple', label: 'Apple', arLabel: 'آبل', origin: 'iOS' },
  { id: 'samsung', label: 'Samsung', arLabel: 'سامسونج', origin: 'Android' },
  { id: 'xiaomi', label: 'Xiaomi', arLabel: 'شاومي', origin: 'Android' },
  { id: 'google', label: 'Google', arLabel: 'جوجل Pixel', origin: 'Android' },
  { id: 'oneplus', label: 'OnePlus', arLabel: 'ون بلس', origin: 'Android' },
  { id: 'tecno', label: 'Tecno', arLabel: 'تكنو', origin: 'Android' },
  { id: 'infinix', label: 'Infinix', arLabel: 'إنفنكس', origin: 'Android' },
];

export function tText(text: BilingualText, lang: Language): string {
  return lang === 'ar' ? text.ar : text.en;
}

export function formatCity(cityId: CityId | 'all', lang: Language): string {
  if (cityId === 'all') {
    return lang === 'ar' ? 'جميع ولايات السودان' : 'All Sudan States';
  }
  const city = CITIES.find((c) => c.id === cityId);
  return city ? tText(city.name, lang) : cityId;
}

export function formatSdg(amount: number, lang: Language): string {
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(amount));
  return lang === 'ar' ? `${formatted} ج.س` : `${formatted} SDG`;
}

export function formatCondition(condition: DeviceCondition, lang: Language): string {
  if (condition === 'new') {
    return lang === 'ar' ? 'جديد' : 'New';
  }
  return lang === 'ar' ? 'مستعمل' : 'Used';
}

export function formatUsedGrade(grade: UsedGrade | undefined, lang: Language): string {
  const map: Record<UsedGrade, BilingualText> = {
    like_new: { ar: 'كالجديد', en: 'Like New' },
    excellent: { ar: 'ممتاز', en: 'Excellent' },
    good: { ar: 'جيد', en: 'Good' },
    fair: { ar: 'مقبول', en: 'Fair' },
  };
  return grade ? tText(map[grade], lang) : '';
}

export function formatUsedAvailability(av: UsedAvailability | undefined, lang: Language): string {
  const map: Record<UsedAvailability, BilingualText> = {
    available: { ar: 'قطعة متاحة', en: 'Unit Available' },
    reserved: { ar: 'محجوزة للمعاينة', en: 'Reserved' },
    sold: { ar: 'تم البيع', en: 'Sold' },
  };
  return av ? tText(map[av], lang) : '';
}

export function formatVerificationStatus(status: VerificationStatus, lang: Language): string {
  const map: Record<VerificationStatus, BilingualText> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    submitted: { ar: 'قيد المراجعة', en: 'Awaiting Review' },
    changes_requested: { ar: 'مطلوب تعديلات', en: 'Changes Requested' },
    verified: { ar: 'متجر موثّق', en: 'Verified Store' },
    suspended: { ar: 'موقوف مؤقتاً', en: 'Suspended' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };
  return tText(map[status], lang);
}

export function formatPublicationStatus(status: PublicationStatus, lang: Language): string {
  const map: Record<PublicationStatus, BilingualText> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    processing: { ar: 'جاري معالجة الصور', en: 'Processing Photos' },
    needs_correction: { ar: 'يحتاج تصحيح', en: 'Needs Correction' },
    published: { ar: 'منشور وظاهر للعملاء', en: 'Published' },
    flagged: { ar: 'مُعلّم للمراجعة', en: 'Flagged for Review' },
    removed_suspended: { ar: 'مُزال / مخفي', en: 'Removed / Hidden' },
  };
  return tText(map[status], lang);
}

export function formatStaffRole(role: StoreStaffRole, lang: Language): string {
  const map: Record<StoreStaffRole, BilingualText> = {
    owner: { ar: 'مالك المتجر', en: 'Store Owner' },
    manager: { ar: 'مدير المخزون', en: 'Inventory Manager' },
    clerk: { ar: 'موظف مبيعات', en: 'Sales Clerk' },
  };
  return tText(map[role], lang);
}

export function formatListingTitle(
  arabicBrandPrefix: string,
  model: string,
  lang: Language
): string {
  return lang === 'ar' ? `${arabicBrandPrefix} ${model}` : model;
}

export function formatAuthFileSize(bytes: number, lang: Language): string {
  if (bytes < 1024) return lang === 'ar' ? `${bytes} بايت` : `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = Math.round(bytes / 1024);
    return lang === 'ar' ? `${kb} كيلوبايت` : `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return lang === 'ar' ? `${mb} ميجابايت` : `${mb} MB`;
}

export function formatCoordinates(lat: number, lng: number, lang: Language): string {
  if (lang === 'ar') {
    return `${lat.toFixed(4)}° ش، ${lng.toFixed(4)}° ق`;
  }
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

export const AUTH_COPY = {
  brandName: { ar: 'سودان فونز', en: 'Sudan Phones' },
  brandTagline: {
    ar: 'سوق الموبايلات الموثّق · متاجر فعلية فقط',
    en: 'Verified Phone Marketplace · Physical Stores Only',
  },
  pilotCities: {
    ar: 'بورتسودان · الخرطوم · أم درمان',
    en: 'Port Sudan · Khartoum · Omdurman',
  },
  skipLaunchAria: { ar: 'تخطي شاشة الترحيب', en: 'Skip launch intro' },
  langToggleLabel: { ar: 'EN', en: 'عربي' },
  langToggleFull: { ar: 'English', en: 'العربية' },
  langToggleAria: { ar: 'تغيير اللغة إلى الإنجليزية', en: 'Switch language to Arabic' },
  back: { ar: 'رجوع', en: 'Back' },
  close: { ar: 'إغلاق', en: 'Close' },
  edit: { ar: 'تعديل', en: 'Edit' },
  change: { ar: 'تغيير', en: 'Change' },
  clear: { ar: 'مسح', en: 'Clear' },
  required: { ar: 'مطلوب', en: 'Required' },
  orDivider: { ar: 'أو', en: 'or' },
  orContinueWith: { ar: 'أو تابع باستخدام', en: 'or continue with' },
  rememberMe: { ar: 'تذكرني', en: 'Remember me' },
  dialCodeAria: { ar: 'مفتاح الدولة', en: 'Country dial code' },

  // Carriers
  carrierZain: { ar: 'زين السودان', en: 'Zain Sudan' },
  carrierMtn: { ar: 'إم تي إن السودان', en: 'MTN Sudan' },
  carrierSudani: { ar: 'سوداني', en: 'Sudani' },
  carrierHint: { ar: 'يدعم زين وإم تي إن وسوداني', en: 'Supports Zain, MTN & Sudani' },
  sudanOnlyLabel: { ar: 'أرقام السودان فقط', en: 'Sudan numbers only' },
  sudanOnlyHelper: {
    ar: 'تسجيل المتاجر يقبل أرقام السودان (+249) فقط للتحقق المحلي.',
    en: 'Merchant registration accepts Sudan (+249) numbers only for local verification.',
  },

  // First page (Welcome) hero & theme toggle
  firstPageHeroLine1: { ar: 'أفضل تطبيق', en: 'The best' },
  firstPageHeroLine2: { ar: 'لشراء وبيع', en: 'app for' },
  firstPageHeroHighlight: { ar: 'هواتفك', en: 'your phones' },
  firstPageSubtitle: {
    ar: 'هواتف جديدة ومستعملة مفحوصة من متاجر فعلية موثّقة في السودان.',
    en: 'New & inspected used phones from verified physical stores across Sudan.',
  },
  firstPageSignIn: { ar: 'تسجيل الدخول', en: 'Sign in' },
  firstPageCreateAccount: { ar: 'إنشاء حساب جديد', en: 'Create an account' },
  themeToggleLightAria: { ar: 'التبديل إلى الوضع النهاري', en: 'Switch to light mode' },
  themeToggleDarkAria: { ar: 'التبديل إلى الوضع الليلي', en: 'Switch to dark mode' },

  // Login screen
  loginTitleCustomer: { ar: 'مرحباً بعودتك', en: 'Welcome Back' },
  loginTitleMerchant: { ar: 'دخول المتجر', en: 'Store Sign In' },
  loginSubtitleCustomer: {
    ar: 'سجّل الدخول إلى حسابك',
    en: 'Login to your account',
  },
  loginSubtitleMerchant: {
    ar: 'سجّل الدخول لإدارة مخزون متجرك',
    en: 'Sign in to manage your store inventory',
  },
  loginTabPhone: { ar: 'الهاتف (+249)', en: 'Phone (+249)' },
  loginTabEmail: { ar: 'البريد الإلكتروني', en: 'Email' },
  emailLabel: { ar: 'البريد الإلكتروني', en: 'Email address' },
  emailPlaceholder: { ar: 'أدخل بريدك الإلكتروني', en: 'Enter your email address' },
  biometricAria: { ar: 'تسجيل الدخول بالبصمة', en: 'Sign in with biometrics' },
  phoneLabel: { ar: 'رقم الهاتف', en: 'Phone number' },
  phoneLabelMerchant: { ar: 'رقم الهاتف السوداني (+249)', en: 'Sudan phone number (+249)' },
  passwordLabel: { ar: 'كلمة المرور', en: 'Password' },
  passwordPlaceholder: { ar: 'أدخل كلمة المرور', en: 'Enter your password' },
  forgotPassword: { ar: 'نسيت كلمة المرور؟', en: 'Forgot password?' },
  showPassword: { ar: 'إظهار كلمة المرور', en: 'Show password' },
  hidePassword: { ar: 'إخفاء كلمة المرور', en: 'Hide password' },
  signInCta: { ar: 'تسجيل الدخول', en: 'Sign In' },
  continueGoogle: { ar: 'جوجل', en: 'Google' },
  continueWhatsApp: { ar: 'واتساب', en: 'WhatsApp' },
  continueApple: { ar: 'آبل', en: 'Apple' },
  noAccountPrompt: { ar: 'جديد في سودان فونز؟', en: 'New to Sudan Phones?' },
  createAccountLink: { ar: 'إنشاء حساب', en: 'Create account' },
  browseAsGuest: { ar: 'تصفح الهواتف كضيف', en: 'Browse as guest' },
  merchantLoginLink: { ar: 'دخول التاجر', en: 'Merchant sign in' },
  buyerLoginLink: { ar: 'دخول المشتري', en: 'Buyer sign in' },

  // Create Account screen
  createAccountHeader: { ar: 'إنشاء حساب', en: 'Create Account' },
  createAccountTitle: { ar: 'إنشاء حساب', en: 'Create Account' },
  createAccountSubtitleCustomer: {
    ar: 'أنشئ حسابك الجديد',
    en: 'Create your new account',
  },
  createAccountSubtitleMerchant: {
    ar: 'أنشئ حساب متجرك الفعلي الموثّق',
    en: 'Create your verified phone shop account',
  },
  rolePersonalBuyer: { ar: 'مشتري شخصي', en: 'Personal Buyer' },
  rolePhoneShop: { ar: 'متجر هواتف', en: 'Phone Shop' },
  selectCityPlaceholder: { ar: 'اختر مدينتك في السودان', en: 'Select your city in Sudan' },
  agreePrefix: { ar: 'أوافق على', en: 'I agree to the' },
  termsImeiPolicy: { ar: 'الشروط وسياسة نزاهة IMEI', en: 'Terms & IMEI Fair-Trade Policy' },
  errTermsRequired: {
    ar: 'يرجى الموافقة على الشروط وسياسة نزاهة IMEI للمتابعة',
    en: 'Please agree to the Terms & IMEI Fair-Trade Policy to continue',
  },
  stepIndicatorCustomer: {
    ar: 'الخطوة 1 من 2 · بيانات الحساب',
    en: 'Step 1 of 2 · Account details',
  },
  stepIndicatorMerchant: {
    ar: 'الخطوة 1 من 2 · بيانات الحساب والمتجر',
    en: 'Step 1 of 2 · Account & store details',
  },
  fullNameLabel: { ar: 'الاسم الكامل', en: 'Full Name' },
  fullNamePlaceholder: { ar: 'الاسم الكامل', en: 'Full Name' },
  newPasswordPlaceholder: { ar: 'أدخل كلمة المرور', en: 'Enter your password' },
  passwordHelper: {
    ar: 'استخدم 6 أحرف على الأقل مع أرقام أو رموز لحماية أفضل.',
    en: 'Use at least 6 characters with numbers or symbols for stronger security.',
  },
  passwordStrengthWeak: { ar: 'كلمة مرور ضعيفة', en: 'Weak password' },
  passwordStrengthMedium: { ar: 'كلمة مرور متوسطة', en: 'Medium strength' },
  passwordStrengthStrong: { ar: 'كلمة مرور قوية', en: 'Strong password' },
  confirmPasswordLabel: { ar: 'تأكيد كلمة المرور', en: 'Confirm password' },
  confirmPasswordPlaceholder: { ar: 'أعد إدخال كلمة المرور', en: 'Re-enter your password' },
  showConfirmPassword: { ar: 'إظهار تأكيد كلمة المرور', en: 'Show confirm password' },
  hideConfirmPassword: { ar: 'إخفاء تأكيد كلمة المرور', en: 'Hide confirm password' },
  passwordsMatch: { ar: 'كلمتا المرور متطابقتان', en: 'Passwords match' },
  passwordsMismatch: { ar: 'كلمتا المرور غير متطابقتين', en: 'Passwords do not match' },
  stateLabel: { ar: 'الولاية', en: 'City / State' },
  stateHelper: { ar: 'اختر ولايتك لعرض أقرب المتاجر الموثّقة.', en: 'Choose your state to see nearby verified stores.' },
  registerStoreToggleTitle: { ar: 'التسجيل كمتجر هواتف فعلي', en: 'Register as a physical phone store' },
  registerStoreToggleHelper: { ar: 'للمحلات التجارية الموثّقة فقط', en: 'For verified physical shops only' },
  toggleOn: { ar: 'مفعّل', en: 'On' },
  toggleOff: { ar: 'معطّل', en: 'Off' },
  createAccountSubmit: { ar: 'إنشاء حساب', en: 'Create Account' },
  registerStoreSubmit: { ar: 'تسجيل المتجر وإرسال للمراجعة', en: 'Submit Store for Review' },
  alreadyHaveAccount: { ar: 'لديك حساب بالفعل؟', en: 'Already have an account?' },

  // Store Registration section
  storeInfoTitle: { ar: 'معلومات المتجر', en: 'Store Information' },
  storeInfoHelper: {
    ar: 'تُراجع بيانات متجرك وشهادة التسجيل قبل تفعيل الحساب.',
    en: 'Your store details and registration certificate are reviewed before activation.',
  },
  storeNameLabel: { ar: 'اسم المتجر', en: 'Store name' },
  storeNamePlaceholder: { ar: 'مثلاً: متجر الميناء للهواتف', en: 'e.g., Al-Mina Mobile Shop' },
  certificateLabel: { ar: 'شهادة التسجيل', en: 'Registration certificate' },
  uploadCertTitle: {
    ar: 'ارفع شهادة السجل التجاري أو الترخيص',
    en: 'Upload commercial certificate or license',
  },
  uploadCertHelper: {
    ar: 'PDF أو JPG/PNG حتى 5MB',
    en: 'PDF or JPG/PNG up to 5MB',
  },
  attachSampleCert: { ar: 'إرفاق نموذج تجريبي', en: 'Attach sample document' },
  sampleCertFileName: { ar: 'شهادة_التسجيل_التجاري_2026.pdf', en: 'store_registration_cert_2026.pdf' },
  sampleCertFileSize: { ar: '420 كيلوبايت', en: '420 KB' },
  removeFile: { ar: 'إزالة الملف', en: 'Remove file' },
  detailedAddressLabel: { ar: 'العنوان التفصيلي', en: 'Detailed address' },
  detailedAddressPlaceholder: {
    ar: 'مثلاً: السوق الكبير، شارع الميناء، بجوار بنك الخرطوم',
    en: 'e.g., Main Souq, Port Street, next to Bank of Khartoum',
  },
  mapLocationLabel: { ar: 'الموقع على الخريطة', en: 'Map location' },
  pickFromMap: { ar: 'اختر الموقع من الخريطة', en: 'Pick location from map' },
  mapPickerHelper: {
    ar: 'يساعد المشترين في الوصول إلى موقع متجرك بدقة.',
    en: 'Helps buyers find your physical store accurately.',
  },
  mapDialogTitle: { ar: 'تحديد موقع المتجر', en: 'Pick Store Location' },
  mapDialogHint: {
    ar: 'اضغط على أي نقطة في الخريطة أو اختر أقرب حي',
    en: 'Tap anywhere on the map or select a nearby district',
  },
  mapDialogClose: { ar: 'إغلاق الخريطة', en: 'Close map' },
  mapInteractiveAria: { ar: 'خريطة تفاعلية لتحديد الموقع', en: 'Interactive map to pick location' },
  confirmMapLocation: { ar: 'تأكيد موقع المتجر', en: 'Confirm store location' },

  // Validation messages (all existing rules preserved)
  errMerchantSudanOnly: {
    ar: 'تسجيل المتاجر يقبل أرقام السودان (+249) فقط',
    en: 'Merchant registration accepts Sudan (+249) numbers only',
  },
  errSudanPhoneLength: {
    ar: 'أدخل رقم هاتف سوداني صحيح (9 أرقام بعد +249)',
    en: 'Enter a valid 9-digit Sudan number after +249',
  },
  errPasswordRequired: {
    ar: 'يرجى إدخال كلمة المرور للمتابعة',
    en: 'Please enter your password to sign in',
  },
  errPasswordCreateRequired: {
    ar: 'يرجى إنشاء كلمة مرور للحساب',
    en: 'Please create a password for your account',
  },
  errPasswordMinLength: {
    ar: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    en: 'Password must be at least 6 characters',
  },
  errPasswordMismatch: {
    ar: 'كلمتا المرور غير متطابقتين — يرجى التأكد وإعادة المحاولة',
    en: 'Passwords do not match — please check and try again',
  },
  errFullNameRequired: {
    ar: 'يرجى إدخال الاسم الكامل للمتابعة',
    en: 'Please enter your full name',
  },
  errEmailInvalid: {
    ar: 'يرجى إدخال بريد إلكتروني صحيح لاستلام الرمز',
    en: 'Please enter a valid email address for the code',
  },
  errStoreNameRequired: {
    ar: 'يرجى إدخال اسم المتجر الفعلي',
    en: 'Please enter your physical store name',
  },
  errCertificateRequired: {
    ar: 'يرجى إرفاق شهادة تسجيل المتجر لإتمام الطلب',
    en: 'Please attach your store registration certificate',
  },
  errStoreAddressRequired: {
    ar: 'يرجى كتابة العنوان التفصيلي للمتجر',
    en: 'Please enter the detailed store address',
  },
  errMapLocationRequired: {
    ar: 'يرجى اختيار موقع المتجر من الخريطة',
    en: 'Please pick the store location from the map',
  },

  // OTP & Recovery & Welcome & Pending Review
  otpHeader: { ar: 'التحقق من الرقم', en: 'Verify number' },
  otpTitle: { ar: 'أدخل رمز التحقق', en: 'Enter the 6-digit code' },
  otpSentWhatsApp: { ar: 'أُرسل عبر واتساب إلى ', en: 'Sent via WhatsApp to ' },
  otpSentEmail: { ar: 'أُرسل عبر البريد الإلكتروني إلى ', en: 'Sent via Email to ' },
  otpEmailNote: {
    ar: 'ملاحظة: التحقق عبر البريد الإلكتروني يوثّق بريدك فقط ولا يثبت ملكية رقم واتساب.',
    en: 'Note: Email verification confirms your email only — it does not verify WhatsApp ownership.',
  },
  otpDigitAria: { ar: 'خانة الرمز', en: 'Code digit' },
  otpDemoLabel: { ar: 'رمز تجريبي:', en: 'Demo code:' },
  otpFillDemo: { ar: 'تعبئة 123456', en: 'Fill 123456' },
  otpTestError: { ar: 'اختبار خطأ', en: 'Test error' },
  otpNotReceived: { ar: 'لم يصلك الرمز؟', en: "Didn't receive it?" },
  otpResendNow: { ar: 'إعادة الإرسال الآن', en: 'Resend now' },
  otpVerifyCta: { ar: 'تأكيد والمتابعة', en: 'Verify & Continue' },
  otpErrLength: { ar: 'أكمل إدخال الأرقام الستة للتحقق', en: 'Enter all 6 verification digits' },
  otpErrInvalid: {
    ar: 'رمز التحقق غير صحيح أو منتهي الصلاحية. حاول مرة أخرى.',
    en: 'Invalid or expired verification code. Please try again.',
  },

  recoveryHeader: { ar: 'استعادة الحساب', en: 'Account recovery' },
  recoveryTitle: { ar: 'استعادة الوصول لحسابك', en: 'Recover access' },
  recoverySubtitle: {
    ar: 'اختر قناة استلام رمز التحقق عبر واتساب أو البريد الإلكتروني.',
    en: 'Choose a verification channel via WhatsApp or Email.',
  },
  viaWhatsApp: { ar: 'عبر واتساب', en: 'WhatsApp' },
  viaEmail: { ar: 'البريد الإلكتروني', en: 'Email' },
  registeredWhatsAppLabel: { ar: 'رقم واتساب المسجل', en: 'Registered WhatsApp number' },
  registeredEmailLabel: { ar: 'البريد الإلكتروني المسجل', en: 'Registered email address' },
  sendRecoveryCta: { ar: 'إرسال رمز الاستعادة', en: 'Send recovery code' },

  welcomeBadge: { ar: 'متاجر فعلية موثّقة فقط', en: 'Verified physical stores only' },
  welcomeTitle: {
    ar: 'قارن أسعار الهواتف في السودان بثقة',
    en: 'Compare Sudan phone prices with trust',
  },
  welcomeSubtitle: {
    ar: 'هواتف جديدة مختومة ومستعملة مفحوصة بالجنيه السوداني وتواصل مباشر عبر واتساب.',
    en: 'Sealed new & inspected used phones priced in SDG with direct WhatsApp store contact.',
  },
  selectedCityLabel: { ar: 'المدينة المختارة', en: 'Selected city' },
  browseGuestNow: { ar: 'تصفح الهواتف كضيف الآن', en: 'Browse Phones as Guest' },

  pendingHeader: { ar: 'حالة طلب المتجر', en: 'Application status' },
  pendingStatus: { ar: 'قيد المراجعة والتوثيق', en: 'Under review & verification' },
  pendingTitle: { ar: 'تم استلام طلب تسجيل متجرك', en: 'Store application received' },
  pendingDesc: {
    ar: 'طلبك الآن قيد المراجعة من فريق سودان فونز للتحقق من شهادة التسجيل وموقع المتجر. سنشعرك فور تفعيل الحساب.',
    en: 'Your request is currently under review by the Sudan Phones team to verify your certificate and store location. We will notify you once approved.',
  },
  refNumberLabel: { ar: 'رقم الطلب', en: 'Reference' },
  statusLabel: { ar: 'حالة الطلب', en: 'Status' },
  underReviewValue: { ar: 'قيد المراجعة', en: 'Under Review' },
  locationLabel: { ar: 'موقع المتجر', en: 'Location' },
  trackInMerchantPortal: {
    ar: 'متابعة حالة الطلب في بوابة التاجر',
    en: 'Track in Merchant Portal',
  },
} as const;

