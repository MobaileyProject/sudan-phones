import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  FileUp,
  Globe,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Moon,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  Sun,
  User,
  X,
} from 'lucide-react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { CityId } from '../../types';
import {
  AUTH_COPY,
  CITIES,
  COUNTRY_DIAL_CODES,
  formatAuthFileSize,
  formatCity,
  formatCoordinates,
  tText,
} from '../../i18n/translations';
import { IMAGES } from '../../data/mockData';
import { usePrototype } from '../../store/PrototypeContext';
import {
  AppleIcon,
  AuthFieldError,
  AuthFieldLabel,
  AuthInputField,
  AuthLogoTile,
  AuthPhoneField,
  AuthPrimaryButton,
  AuthSelectField,
  AuthTextAreaField,
  BrandMark,
  FloatingCornerPhone,
  ForestPhonesBackdrop,
  GoogleIcon,
  HeroBrandRoller,
  PasswordStrengthMeter,
  WhatsAppIcon,
  scrollFieldIntoView,
} from './AuthPrimitives';

export type MobileEntryScreen =
  | 'launch'
  | 'welcome'
  | 'signin'
  | 'register'
  | 'otp'
  | 'recovery'
  | 'pending_review';

export type AuthThemeMode = 'light' | 'dark';

type ErrorFieldKey =
  | null
  | 'phone'
  | 'loginPassword'
  | 'fullName'
  | 'regPassword'
  | 'storeName'
  | 'certificate'
  | 'storeAddress'
  | 'mapLocation'
  | 'email'
  | 'terms';

interface MapLandmark {
  id: string;
  ar: string;
  en: string;
  xPct: number;
  yPct: number;
  lat: number;
  lng: number;
}

interface StateMapMeta {
  baseLat: number;
  baseLng: number;
  waterLabel: { ar: string; en: string };
  landmarks: MapLandmark[];
}

function buildStateMap(
  prefix: string,
  baseLat: number,
  baseLng: number,
  waterLabel: { ar: string; en: string },
  spots: { ar: string; en: string; xPct: number; yPct: number }[]
): StateMapMeta {
  return {
    baseLat,
    baseLng,
    waterLabel,
    landmarks: spots.map((s, idx) => ({
      id: `${prefix}-${idx}`,
      ar: s.ar,
      en: s.en,
      xPct: s.xPct,
      yPct: s.yPct,
      lat: Number((baseLat + ((50 - s.yPct) / 100) * 0.055).toFixed(4)),
      lng: Number((baseLng + ((s.xPct - 50) / 100) * 0.065).toFixed(4)),
    })),
  };
}

const CITY_MAP_DATA: Record<CityId, StateMapMeta> = {
  port_sudan: {
    baseLat: 19.6158,
    baseLng: 37.2164,
    waterLabel: { ar: 'البحر الأحمر', en: 'Red Sea' },
    landmarks: [
      { id: 'ps-souq', ar: 'السوق الكبير', en: 'Main Souq', xPct: 50, yPct: 48, lat: 19.6158, lng: 37.2164 },
      { id: 'ps-port', ar: 'شارع الميناء', en: 'Port Street', xPct: 72, yPct: 38, lat: 19.6194, lng: 37.2248 },
      { id: 'ps-airport', ar: 'حي المطار', en: 'Airport District', xPct: 28, yPct: 66, lat: 19.6041, lng: 37.2062 },
      { id: 'ps-deim', ar: 'ديم المدينة', en: 'Deim Al-Madina', xPct: 40, yPct: 27, lat: 19.6231, lng: 37.2119 },
    ],
  },
  khartoum: {
    baseLat: 15.588,
    baseLng: 32.5356,
    waterLabel: { ar: 'النيل الأزرق', en: 'Blue Nile' },
    landmarks: [
      { id: 'kh-siteen', ar: 'شارع الستين', en: 'Al-Siteen St', xPct: 70, yPct: 58, lat: 15.5742, lng: 32.5672 },
      { id: 'kh-amarat', ar: 'العمارات', en: 'Al-Amarat', xPct: 52, yPct: 45, lat: 15.588, lng: 32.5435 },
      { id: 'kh-riyadh', ar: 'الرياض', en: 'Al-Riyadh', xPct: 74, yPct: 36, lat: 15.5951, lng: 32.5698 },
      { id: 'kh-arabi', ar: 'السوق العربي', en: 'Souq Al-Arabi', xPct: 34, yPct: 30, lat: 15.6034, lng: 32.5269 },
    ],
  },
  omdurman: {
    baseLat: 15.6445,
    baseLng: 32.4777,
    waterLabel: { ar: 'نهر النيل', en: 'Nile River' },
    landmarks: [
      { id: 'om-souq', ar: 'سوق أم درمان', en: 'Omdurman Souq', xPct: 54, yPct: 52, lat: 15.6445, lng: 32.4777 },
      { id: 'om-shuhada', ar: 'الشهداء', en: 'Al-Shuhada', xPct: 45, yPct: 37, lat: 15.6522, lng: 32.4731 },
      { id: 'om-thawra', ar: 'الثورة الحارة 5', en: 'Al-Thawra', xPct: 31, yPct: 24, lat: 15.6768, lng: 32.4644 },
      { id: 'om-mohandeseen', ar: 'المهندسين', en: 'Al-Mohandeseen', xPct: 62, yPct: 68, lat: 15.6291, lng: 32.4825 },
    ],
  },
  al_jazirah: buildStateMap('jz', 14.4012, 33.5199, { ar: 'النيل الأزرق', en: 'Blue Nile' }, [
    { ar: 'السوق الكبير ود مدني', en: 'Wad Madani Souq', xPct: 52, yPct: 48 },
    { ar: 'حي الدرجة', en: 'Al-Daraja', xPct: 36, yPct: 34 },
    { ar: 'المزاد', en: 'Al-Mazad', xPct: 68, yPct: 58 },
    { ar: 'المناقل', en: 'Al-Managil', xPct: 26, yPct: 66 },
  ]),
  river_nile: buildStateMap('rn', 17.6976, 33.9781, { ar: 'نهر النيل', en: 'Nile River' }, [
    { ar: 'سوق عطبرة الكبير', en: 'Atbara Main Souq', xPct: 50, yPct: 46 },
    { ar: 'الدامر المركز', en: 'Ed Damer Center', xPct: 38, yPct: 62 },
    { ar: 'شندي السوق', en: 'Shendi Market', xPct: 66, yPct: 72 },
    { ar: 'بربر', en: 'Berber', xPct: 48, yPct: 25 },
  ]),
  northern: buildStateMap('no', 19.1698, 30.4749, { ar: 'نهر النيل', en: 'Nile River' }, [
    { ar: 'سوق دنقلا', en: 'Dongola Souq', xPct: 52, yPct: 48 },
    { ar: 'كريمة', en: 'Karima', xPct: 66, yPct: 64 },
    { ar: 'مروي', en: 'Merowe', xPct: 60, yPct: 72 },
    { ar: 'وادي حلفا', en: 'Wadi Halfa', xPct: 44, yPct: 22 },
  ]),
  kassala: buildStateMap('ks', 15.451, 36.3999, { ar: 'نهر القاش', en: 'Gash River' }, [
    { ar: 'السوق الكبير كسلا', en: 'Kassala Main Souq', xPct: 52, yPct: 48 },
    { ar: 'حي الميرغنية', en: 'Al-Mirghaniya', xPct: 68, yPct: 38 },
    { ar: 'الختمية', en: 'Al-Khatmiya', xPct: 36, yPct: 58 },
    { ar: 'حلفا الجديدة', en: 'New Halfa', xPct: 28, yPct: 34 },
  ]),
  gedaref: buildStateMap('gd', 14.0349, 35.3834, { ar: 'ولاية القضارف', en: 'Al Qadarif' }, [
    { ar: 'سوق القضارف العمومي', en: 'Gedaref Central Souq', xPct: 50, yPct: 48 },
    { ar: 'حي المطار', en: 'Airport District', xPct: 68, yPct: 36 },
    { ar: 'ديم بكر', en: 'Deim Bakr', xPct: 36, yPct: 60 },
    { ar: 'الشواك', en: 'Al-Showak', xPct: 74, yPct: 64 },
  ]),
  sennar: buildStateMap('sn', 13.1483, 33.9312, { ar: 'النيل الأزرق', en: 'Blue Nile' }, [
    { ar: 'سوق سنجة', en: 'Singa Market', xPct: 52, yPct: 48 },
    { ar: 'سوق سنار التقاطع', en: 'Sennar Junction', xPct: 38, yPct: 32 },
    { ar: 'السوكي', en: 'Al-Suki', xPct: 66, yPct: 56 },
    { ar: 'الدندر', en: 'Dinder', xPct: 74, yPct: 68 },
  ]),
  white_nile: buildStateMap('wn', 13.1629, 32.6635, { ar: 'النيل الأبيض', en: 'White Nile' }, [
    { ar: 'سوق كوستي الكبير', en: 'Kosti Main Souq', xPct: 46, yPct: 50 },
    { ar: 'سوق ربك', en: 'Rabak Market', xPct: 62, yPct: 48 },
    { ar: 'الدويم', en: 'Ed Dueim', xPct: 48, yPct: 28 },
    { ar: 'الجزيرة أبا', en: 'Aba Island', xPct: 56, yPct: 66 },
  ]),
  blue_nile: buildStateMap('bn', 11.7891, 34.3592, { ar: 'خزان الروصيرص', en: 'Roseires Dam' }, [
    { ar: 'سوق الدمازين', en: 'Ad-Damazin Souq', xPct: 48, yPct: 48 },
    { ar: 'الروصيرص', en: 'Roseires', xPct: 64, yPct: 42 },
    { ar: 'الرصيرص السوق الشعبي', en: 'Popular Market', xPct: 36, yPct: 62 },
    { ar: 'باو', en: 'Baw', xPct: 30, yPct: 32 },
  ]),
  north_kordofan: buildStateMap('nk', 13.1833, 30.2167, { ar: 'شمال كردفان', en: 'North Kordofan' }, [
    { ar: 'سوق الأبيض الكبير', en: 'El-Obeid Souq', xPct: 52, yPct: 48 },
    { ar: 'حي القبة', en: 'Al-Qubba', xPct: 38, yPct: 36 },
    { ar: 'أم روابة', en: 'Um Rawaba', xPct: 72, yPct: 56 },
    { ar: 'بارا', en: 'Bara', xPct: 54, yPct: 26 },
  ]),
  south_kordofan: buildStateMap('sk', 11.0111, 29.7183, { ar: 'جبال النوبة', en: 'Nuba Mountains' }, [
    { ar: 'سوق كادوقلي', en: 'Kadugli Souq', xPct: 50, yPct: 50 },
    { ar: 'الدلنج', en: 'Dilling', xPct: 44, yPct: 28 },
    { ar: 'أبو جبيهة', en: 'Abu Jubeiha', xPct: 70, yPct: 46 },
    { ar: 'تلودي', en: 'Talodi', xPct: 64, yPct: 68 },
  ]),
  west_kordofan: buildStateMap('wk', 11.7329, 28.3579, { ar: 'غرب كردفان', en: 'West Kordofan' }, [
    { ar: 'سوق الفولة', en: 'Al-Fulah Souq', xPct: 50, yPct: 48 },
    { ar: 'النهود', en: 'En Nahud', xPct: 46, yPct: 26 },
    { ar: 'المجلد', en: 'Al-Muglad', xPct: 34, yPct: 64 },
    { ar: 'بابنوسة', en: 'Babanusa', xPct: 64, yPct: 56 },
  ]),
  north_darfur: buildStateMap('nd', 13.6279, 25.3494, { ar: 'شمال دارفور', en: 'North Darfur' }, [
    { ar: 'سوق الفاشر الكبير', en: 'El Fasher Souq', xPct: 52, yPct: 48 },
    { ar: 'حي الدرجة الأولى', en: 'First Class District', xPct: 38, yPct: 36 },
    { ar: 'كتم', en: 'Kutum', xPct: 32, yPct: 24 },
    { ar: 'مليط', en: 'Mellit', xPct: 64, yPct: 30 },
  ]),
  south_darfur: buildStateMap('sd', 12.0489, 24.8807, { ar: 'جنوب دارفور', en: 'South Darfur' }, [
    { ar: 'سوق نيالا الكبير', en: 'Nyala Main Souq', xPct: 52, yPct: 48 },
    { ar: 'حي المطار', en: 'Airport District', xPct: 68, yPct: 38 },
    { ar: 'السوق الشعبي', en: 'Popular Souq', xPct: 38, yPct: 58 },
    { ar: 'كاس', en: 'Kass', xPct: 28, yPct: 36 },
  ]),
  west_darfur: buildStateMap('wd', 13.4526, 22.4473, { ar: 'غرب دارفور', en: 'West Darfur' }, [
    { ar: 'سوق الجنينة الكبير', en: 'Geneina Souq', xPct: 50, yPct: 48 },
    { ar: 'حي الجبل', en: 'Al-Jabal', xPct: 38, yPct: 34 },
    { ar: 'كرينك', en: 'Kereneik', xPct: 66, yPct: 52 },
    { ar: 'فور برنقا', en: 'Foro Baranga', xPct: 42, yPct: 70 },
  ]),
  central_darfur: buildStateMap('cd', 12.9092, 23.4706, { ar: 'جبل مرة', en: 'Jebel Marra' }, [
    { ar: 'سوق زالنجي', en: 'Zalingei Souq', xPct: 50, yPct: 48 },
    { ar: 'الحميدية', en: 'Al-Hamidiya', xPct: 38, yPct: 36 },
    { ar: 'نيرتتي', en: 'Nertiti', xPct: 66, yPct: 40 },
    { ar: 'قارسيلا', en: 'Garsila', xPct: 44, yPct: 68 },
  ]),
  east_darfur: buildStateMap('ed', 11.4619, 26.1258, { ar: 'شرق دارفور', en: 'East Darfur' }, [
    { ar: 'سوق الضعين الكبير', en: 'Ed Daein Souq', xPct: 52, yPct: 48 },
    { ar: 'حي المطار', en: 'Airport District', xPct: 66, yPct: 36 },
    { ar: 'الفرودوس', en: 'Al-Firdous', xPct: 38, yPct: 60 },
    { ar: 'أبو كارنكا', en: 'Abu Karinka', xPct: 68, yPct: 64 },
  ]),
};

function formatPhoneByDialCode(raw: string, dialCode: string): string {
  if (dialCode === '+249') {
    const digits = raw.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
}

function detectSudanCarrier(cleanDigits: string, lang: 'ar' | 'en'): string | null {
  if (cleanDigits.length < 2) return null;
  const p = cleanDigits.slice(0, 2);
  if (p === '91' || p === '96' || p === '90') return tText(AUTH_COPY.carrierZain, lang);
  if (p === '92' || p === '99') return tText(AUTH_COPY.carrierMtn, lang);
  if (p === '11' || p === '12') return tText(AUTH_COPY.carrierSudani, lang);
  return null;
}

export function MobileAppAuthScreens({
  screen,
  authTheme = 'light',
  onToggleTheme,
  onNavigate,
  onEnterAppAsGuest,
  onEnterAppSignedIn,
  onOpenCitySheet,
}: {
  screen: MobileEntryScreen;
  authTheme?: AuthThemeMode;
  onToggleTheme?: () => void;
  onNavigate: (next: MobileEntryScreen) => void;
  onEnterAppAsGuest: () => void;
  onEnterAppSignedIn: (profile: {
    name: string;
    phone: string;
    accountType: 'customer' | 'merchant';
  }) => void;
  onOpenCitySheet: () => void;
}) {
  const {
    lang,
    setLang,
    selectedCity,
    setSelectedCity,
    setPortal,
    pushToast,
    registerOrUpdateStore,
    loginWithBackend,
  } = usePrototype();

  const [internalTheme, setInternalTheme] = useState<AuthThemeMode>(authTheme);
  const activeTheme = onToggleTheme ? authTheme : internalTheme;
  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setInternalTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  // Interactive spring-smoothed pointer parallax for the first main window (Welcome)
  const prefersReducedMotion = useReducedMotion();
  const welcomeRawX = useMotionValue(0);
  const welcomeRawY = useMotionValue(0);
  const welcomeSmoothX = useSpring(welcomeRawX, { stiffness: 120, damping: 24, mass: 0.6 });
  const welcomeSmoothY = useSpring(welcomeRawY, { stiffness: 120, damping: 24, mass: 0.6 });
  const backdropParallaxX = useTransform(welcomeSmoothX, [-1, 1], [10, -10]);
  const backdropParallaxY = useTransform(welcomeSmoothY, [-1, 1], [10, -10]);
  const heroParallaxX = useTransform(welcomeSmoothX, [-1, 1], [-3, 3]);
  const heroParallaxY = useTransform(welcomeSmoothY, [-1, 1], [-2, 2]);

  const handleWelcomePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    welcomeRawX.set(Math.max(-1, Math.min(1, normX)));
    welcomeRawY.set(Math.max(-1, Math.min(1, normY)));
  };

  const handleWelcomePointerLeave = () => {
    welcomeRawX.set(0);
    welcomeRawY.set(0);
  };

  const [accountType, setAccountType] = useState<'customer' | 'merchant'>('customer');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [loginEmail, setLoginEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [otpEmail, setOtpEmail] = useState('waleed@example.com');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [regCity, setRegCity] = useState<CityId>(
    selectedCity === 'all' ? 'port_sudan' : selectedCity
  );
  const [storeAddress, setStoreAddress] = useState('');
  const [certificateFile, setCertificateFile] = useState<{
    name: string;
    sizeBytes: number;
    extLabel: string;
    previewUrl?: string;
    isSample?: boolean;
  } | null>(null);
  const [pickedMapLocation, setPickedMapLocation] = useState<{
    lat: number;
    lng: number;
    labelAr: string;
    labelEn: string;
    xPct: number;
    yPct: number;
  } | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [draftPin, setDraftPin] = useState<{
    lat: number;
    lng: number;
    labelAr: string;
    labelEn: string;
    xPct: number;
    yPct: number;
  }>(() => {
    const initial = CITY_MAP_DATA[selectedCity === 'all' ? 'port_sudan' : selectedCity].landmarks[0];
    return {
      lat: initial.lat,
      lng: initial.lng,
      labelAr: initial.ar,
      labelEn: initial.en,
      xPct: initial.xPct,
      yPct: initial.yPct,
    };
  });
  const [submittedMerchantInfo, setSubmittedMerchantInfo] = useState<{
    refCode: string;
    storeName: string;
    ownerName: string;
    phone: string;
    city: CityId;
    address: string;
    certificateName: string;
    lat: number;
    lng: number;
    mapLabel: { ar: string; en: string };
  } | null>(null);

  // Start empty so the placeholder renders cleanly in --placeholder and never looks pre-filled
  const [dialCode, setDialCode] = useState<string>('+249');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [errorField, setErrorField] = useState<ErrorFieldKey>(null);
  const [loadingMode, setLoadingMode] = useState<
    null | 'email' | 'whatsapp' | 'google' | 'apple' | 'merchant' | 'password'
  >(null);

  // Gracefully detect soft keyboard open on mobile viewports via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleViewportResize = () => {
      const ratio = vv.height / window.innerHeight;
      setIsKeyboardOpen(ratio < 0.78 && vv.height < 560);
    };
    vv.addEventListener('resize', handleViewportResize);
    return () => vv.removeEventListener('resize', handleViewportResize);
  }, []);

  // Refs
  const certInputRef = useRef<HTMLInputElement | null>(null);
  const storeSectionRef = useRef<HTMLDivElement | null>(null);

  // OTP 6-digit state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpOrigin, setOtpOrigin] = useState<'signin' | 'register' | 'recovery'>('signin');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const clearError = () => {
    if (formError) setFormError('');
    if (errorField) setErrorField(null);
  };

  const setValidationError = (field: ErrorFieldKey, message: string) => {
    setErrorField(field);
    setFormError(message);
  };

  // Cleanup any uploaded image object URL
  useEffect(() => {
    return () => {
      if (certificateFile?.previewUrl) {
        URL.revokeObjectURL(certificateFile.previewUrl);
      }
    };
  }, [certificateFile?.previewUrl]);

  // Automatically transition from Launch intro -> First Page (Welcome)
  useEffect(() => {
    if (screen !== 'launch') return;
    const timer = window.setTimeout(() => {
      onNavigate('welcome');
    }, 1850);
    return () => window.clearTimeout(timer);
  }, [screen, onNavigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  // Directional icons that mirror for RTL vs LTR
  const BackIcon = lang === 'ar' ? ChevronRight : ChevronLeft;
  const EndChevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  const ForwardArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  // For merchant registration, enforce Sudan (+249) exclusively
  const isMerchantRegister = screen === 'register' && accountType === 'merchant';
  const effectiveDialCode = isMerchantRegister ? '+249' : dialCode;
  const selectedCountry =
    COUNTRY_DIAL_CODES.find((c) => c.code === effectiveDialCode) ?? COUNTRY_DIAL_CODES[0];

  const cleanPhone = phoneDigits.replace(/\D/g, '');
  const carrierLabel = effectiveDialCode === '+249' ? detectSudanCarrier(cleanPhone, lang) : null;

  const stateOptions = CITIES.map((c) => ({
    value: c.id,
    label: tText(c.name, lang),
  }));

  const validatePhoneForMode = (forceSudanOnly: boolean): string | null => {
    const activeCode = forceSudanOnly ? '+249' : effectiveDialCode;
    const country = COUNTRY_DIAL_CODES.find((c) => c.code === activeCode) ?? COUNTRY_DIAL_CODES[0];
    if (forceSudanOnly && activeCode !== '+249') {
      return tText(AUTH_COPY.errMerchantSudanOnly, lang);
    }
    if (activeCode === '+249') {
      if (cleanPhone.length !== 9) {
        return tText(AUTH_COPY.errSudanPhoneLength, lang);
      }
      return null;
    }
    if (cleanPhone.length < Math.min(7, country.minDigits) || cleanPhone.length > 14) {
      return lang === 'ar'
        ? `أدخل رقم هاتف صحيح لدولة ${country.name.ar} (${country.code})`
        : `Enter a valid phone number for ${country.name.en} (${country.code})`;
    }
    return null;
  };

  const handleDialCodeChange = (nextCode: string) => {
    setDialCode(nextCode);
    setPhoneDigits((prev) => formatPhoneByDialCode(prev, nextCode));
    clearError();
  };

  const handleCitySelection = (nextCity: CityId) => {
    setRegCity(nextCity);
    const defaultLandmark = CITY_MAP_DATA[nextCity].landmarks[0];
    setDraftPin({
      lat: defaultLandmark.lat,
      lng: defaultLandmark.lng,
      labelAr: defaultLandmark.ar,
      labelEn: defaultLandmark.en,
      xPct: defaultLandmark.xPct,
      yPct: defaultLandmark.yPct,
    });
    setPickedMapLocation(null);
    clearError();
  };

  const handleSelectAccountRole = (next: 'customer' | 'merchant') => {
    if (next === accountType) return;
    clearError();
    setAccountType(next);
    if (next === 'merchant') {
      if (dialCode !== '+249') {
        setDialCode('+249');
        setPhoneDigits((p) => formatPhoneByDialCode(p, '+249'));
      }
      window.setTimeout(() => {
        storeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 180);
    }
  };

  const handleCertificateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (certificateFile?.previewUrl) {
      URL.revokeObjectURL(certificateFile.previewUrl);
    }
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setCertificateFile({
      name: file.name,
      sizeBytes: file.size,
      extLabel: ext,
      previewUrl,
      isSample: false,
    });
    clearError();
    e.target.value = '';
  };

  const handleAttachSampleCertificate = () => {
    if (certificateFile?.previewUrl) {
      URL.revokeObjectURL(certificateFile.previewUrl);
    }
    setCertificateFile({
      name: tText(AUTH_COPY.sampleCertFileName, lang),
      sizeBytes: 420 * 1024,
      extLabel: 'PDF',
      isSample: true,
    });
    clearError();
  };

  const handleRemoveCertificate = () => {
    if (certificateFile?.previewUrl) {
      URL.revokeObjectURL(certificateFile.previewUrl);
    }
    setCertificateFile(null);
  };

  const handleOpenMapPicker = () => {
    if (pickedMapLocation) {
      setDraftPin(pickedMapLocation);
    } else {
      const def = CITY_MAP_DATA[regCity].landmarks[0];
      setDraftPin({
        lat: def.lat,
        lng: def.lng,
        labelAr: def.ar,
        labelEn: def.en,
        xPct: def.xPct,
        yPct: def.yPct,
      });
    }
    setMapPickerOpen(true);
  };

  const handleMapCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const xPct = Math.max(8, Math.min(92, rawX));
    const yPct = Math.max(10, Math.min(90, rawY));
    const cityMeta = CITY_MAP_DATA[regCity];
    const lat = Number((cityMeta.baseLat + ((50 - yPct) / 100) * 0.055).toFixed(4));
    const lng = Number((cityMeta.baseLng + ((xPct - 50) / 100) * 0.065).toFixed(4));

    let nearest = cityMeta.landmarks[0];
    let minDist = Infinity;
    for (const lm of cityMeta.landmarks) {
      const d = Math.hypot(lm.xPct - xPct, lm.yPct - yPct);
      if (d < minDist) {
        minDist = d;
        nearest = lm;
      }
    }

    setDraftPin({
      lat,
      lng,
      labelAr: minDist < 18 ? nearest.ar : `بالقرب من ${nearest.ar}`,
      labelEn: minDist < 18 ? nearest.en : `Near ${nearest.en}`,
      xPct,
      yPct,
    });
  };

  const handleConfirmMapPin = () => {
    setPickedMapLocation(draftPin);
    setMapPickerOpen(false);
    clearError();
    pushToast('success', {
      ar: `تم تحديد موقع المتجر على الخريطة (${draftPin.labelAr}).`,
      en: `Store location pinned on map (${draftPin.labelEn}).`,
    });
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'email') {
      if (!loginEmail.trim() || !loginEmail.includes('@')) {
        setValidationError('email', tText(AUTH_COPY.errEmailInvalid, lang));
        return;
      }
    } else {
      const phoneErr = validatePhoneForMode(false);
      if (phoneErr) {
        setValidationError('phone', phoneErr);
        return;
      }
    }
    if (!loginPassword.trim()) {
      setValidationError('loginPassword', tText(AUTH_COPY.errPasswordRequired, lang));
      return;
    }
    if (loginPassword.length < 6) {
      setValidationError('loginPassword', tText(AUTH_COPY.errPasswordMinLength, lang));
      return;
    }

    clearError();
    setLoadingMode('password');
    try {
      const payload =
        loginMethod === 'email'
          ? { email: loginEmail.trim(), password: loginPassword }
          : { phone: `${effectiveDialCode}${phoneDigits.replace(/\D/g, '')}`, password: loginPassword };
      const sess = await loginWithBackend(payload);
      setLoadingMode(null);
      if (accountType === 'merchant' && (sess.merchant || sess.role === 'merchant')) {
        pushToast('success', {
          ar: 'تم تسجيل دخول المتجر بنجاح — جاري فتح بوابة التاجر.',
          en: 'Merchant signed in — opening Merchant Portal.',
        });
        setPortal('merchant');
        return;
      }
      pushToast('success', {
        ar: 'تم تسجيل الدخول بنجاح — مرحباً بك في سودان فونز.',
        en: 'Signed in successfully — welcome to Sudan Phones.',
      });
      onEnterAppSignedIn({
        name: fullName.trim() || (loginMethod === 'email' ? loginEmail.trim() : `${effectiveDialCode} ${phoneDigits}`),
        phone: loginMethod === 'email' ? loginEmail.trim() : `${effectiveDialCode} ${phoneDigits}`,
        accountType: sess.merchant ? 'merchant' : 'customer',
      });
    } catch (err: any) {
      setLoadingMode(null);
      const isInvalidCreds = err?.code === 'INVALID_CREDENTIALS' || err?.status === 401;
      setValidationError(
        'loginPassword',
        isInvalidCreds
          ? lang === 'ar'
            ? 'البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة.'
            : 'Invalid email, phone number, or password.'
          : err?.message || (lang === 'ar' ? 'تعذر تسجيل الدخول، حاول مرة أخرى.' : 'Could not sign in. Please try again.')
      );
    }
  };

  const handleMerchantRegistrationSubmit = () => {
    if (!fullName.trim()) {
      setValidationError('fullName', tText(AUTH_COPY.errFullNameRequired, lang));
      return;
    }
    const phoneErr = validatePhoneForMode(true);
    if (phoneErr) {
      setValidationError('phone', phoneErr);
      return;
    }
    if (!regPassword) {
      setValidationError('regPassword', tText(AUTH_COPY.errPasswordCreateRequired, lang));
      return;
    }
    if (regPassword.length < 6) {
      setValidationError('regPassword', tText(AUTH_COPY.errPasswordMinLength, lang));
      return;
    }
    if (!storeName.trim()) {
      setValidationError('storeName', tText(AUTH_COPY.errStoreNameRequired, lang));
      return;
    }
    if (!certificateFile) {
      setValidationError('certificate', tText(AUTH_COPY.errCertificateRequired, lang));
      return;
    }
    if (!storeAddress.trim()) {
      setValidationError('storeAddress', tText(AUTH_COPY.errStoreAddressRequired, lang));
      return;
    }
    if (!pickedMapLocation) {
      setValidationError('mapLocation', tText(AUTH_COPY.errMapLocationRequired, lang));
      return;
    }
    if (!agreedToTerms) {
      setValidationError('terms', tText(AUTH_COPY.errTermsRequired, lang));
      return;
    }

    clearError();
    setLoadingMode('merchant');

    window.setTimeout(() => {
      const formattedPhone = `+249 ${formatPhoneByDialCode(phoneDigits, '+249')}`;
      const trimmedStore = storeName.trim();
      const trimmedOwner = fullName.trim();
      const trimmedAddress = storeAddress.trim();
      const refCode = `SP-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const coordTextAr = formatCoordinates(pickedMapLocation.lat, pickedMapLocation.lng, 'ar');
      const coordTextEn = formatCoordinates(pickedMapLocation.lat, pickedMapLocation.lng, 'en');

      registerOrUpdateStore(
        null,
        {
          name: { ar: trimmedStore, en: trimmedStore },
          city: regCity,
          address: { ar: trimmedAddress, en: trimmedAddress },
          locationGuidance: {
            ar: `${pickedMapLocation.labelAr} · ${coordTextAr}`,
            en: `${pickedMapLocation.labelEn} · ${coordTextEn}`,
          },
          phone: formattedPhone,
          whatsapp: formattedPhone,
          applicantName: { ar: trimmedOwner, en: trimmedOwner },
          applicantPhone: formattedPhone,
          documents: [
            {
              id: `doc-cert-${Date.now()}`,
              type: 'commercial_reg',
              label: { ar: 'شهادة تسجيل المتجر', en: 'Store Registration Certificate' },
              fileName: certificateFile.name,
              uploadedAt: new Date().toISOString().slice(0, 10),
              status: 'uploaded',
              imageUrl: IMAGES.storefront,
              notes: `${certificateFile.extLabel} · ${formatAuthFileSize(certificateFile.sizeBytes, lang)}`,
            },
          ],
        },
        true
      );

      setSubmittedMerchantInfo({
        refCode,
        storeName: trimmedStore,
        ownerName: trimmedOwner,
        phone: formattedPhone,
        city: regCity,
        address: trimmedAddress,
        certificateName: certificateFile.name,
        lat: pickedMapLocation.lat,
        lng: pickedMapLocation.lng,
        mapLabel: { ar: pickedMapLocation.labelAr, en: pickedMapLocation.labelEn },
      });
      setLoadingMode(null);
      onNavigate('pending_review');
    }, 420);
  };

  const requestOtp = (
    origin: 'signin' | 'register' | 'recovery',
    channel: 'whatsapp' | 'email' = otpChannel
  ) => {
    if (origin === 'register' && accountType === 'merchant') {
      handleMerchantRegistrationSubmit();
      return;
    }

    if (origin === 'register' && !fullName.trim()) {
      setValidationError('fullName', tText(AUTH_COPY.errFullNameRequired, lang));
      return;
    }

    if (channel === 'email') {
      if (!otpEmail.trim() || !otpEmail.includes('@')) {
        setValidationError('email', tText(AUTH_COPY.errEmailInvalid, lang));
        return;
      }
    } else {
      const phoneErr = validatePhoneForMode(false);
      if (phoneErr) {
        setValidationError('phone', phoneErr);
        return;
      }
    }

    if (origin === 'register') {
      if (!regPassword) {
        setValidationError('regPassword', tText(AUTH_COPY.errPasswordCreateRequired, lang));
        return;
      }
      if (regPassword.length < 6) {
        setValidationError('regPassword', tText(AUTH_COPY.errPasswordMinLength, lang));
        return;
      }
      if (!agreedToTerms) {
        setValidationError('terms', tText(AUTH_COPY.errTermsRequired, lang));
        return;
      }
    }

    clearError();
    setOtpChannel(channel);
    setLoadingMode(channel);
    window.setTimeout(() => {
      setLoadingMode(null);
      setOtpOrigin(origin);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setCountdown(45);
      onNavigate('otp');
      pushToast('info', {
        ar:
          channel === 'whatsapp'
            ? 'أُرسل رمز التحقق عبر واتساب (أدخل 123456 للنجاح أو 000000 لاختبار الخطأ).'
            : 'أُرسل رمز التحقق عبر البريد الإلكتروني (لا يوثّق رقم واتساب · أدخل 123456 للنجاح).',
        en:
          channel === 'whatsapp'
            ? 'WhatsApp verification code sent (enter 123456 to continue or 000000 to test error).'
            : 'Email verification code sent (verifies email only, not WhatsApp · enter 123456 to continue).',
      });
    }, 320);
  };

  const handleGoogleContinue = () => {
    clearError();
    setLoadingMode('google');
    window.setTimeout(() => {
      setLoadingMode(null);
      if (accountType === 'merchant') {
        pushToast('success', {
          ar: 'تم تسجيل الدخول عبر جوجل — جاري فتح بوابة التاجر.',
          en: 'Signed in with Google — opening Merchant Portal.',
        });
        setPortal('merchant');
        return;
      }
      pushToast('success', {
        ar: 'مرحباً بك في سودان فونز — تم تسجيل الدخول عبر جوجل.',
        en: 'Welcome to Sudan Phones — signed in with Google.',
      });
      onEnterAppSignedIn({
        name: lang === 'ar' ? 'سارة الطيب' : 'Sara El-Tayeb',
        phone: '+249 91 234 5678',
        accountType: 'customer',
      });
    }, 380);
  };

  const handleAppleContinue = () => {
    clearError();
    setLoadingMode('apple');
    window.setTimeout(() => {
      setLoadingMode(null);
      if (accountType === 'merchant') {
        pushToast('success', {
          ar: 'تم تسجيل الدخول عبر آبل — جاري فتح بوابة التاجر.',
          en: 'Signed in with Apple — opening Merchant Portal.',
        });
        setPortal('merchant');
        return;
      }
      pushToast('success', {
        ar: 'مرحباً بك في سودان فونز — تم تسجيل الدخول عبر آبل.',
        en: 'Welcome to Sudan Phones — signed in with Apple.',
      });
      onEnterAppSignedIn({
        name: lang === 'ar' ? 'محمد عثمان' : 'Mohammed Osman',
        phone: '+249 92 440 8821',
        accountType: 'customer',
      });
    }, 380);
  };

  const handleOtpBoxChange = (idx: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (otpError) setOtpError('');

    if (clean.length > 1) {
      const sliced = clean.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      sliced.forEach((ch, i) => {
        next[i] = ch;
      });
      setOtpDigits(next);
      otpRefs.current[Math.min(sliced.length, 5)]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[idx] = clean;
    setOtpDigits(next);
    if (clean && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setOtpError(tText(AUTH_COPY.otpErrLength, lang));
      return;
    }
    if (code === '000000') {
      setOtpError(tText(AUTH_COPY.otpErrInvalid, lang));
      return;
    }

    setOtpError('');
    if (accountType === 'merchant') {
      pushToast('success', {
        ar: 'تم التحقق من رقم المتجر — جاري فتح بوابة التاجر.',
        en: 'Merchant number verified — opening Merchant Portal.',
      });
      setPortal('merchant');
      return;
    }

    if (otpOrigin === 'register') {
      setSelectedCity(regCity);
    }

    pushToast('success', {
      ar:
        otpOrigin === 'recovery'
          ? 'تمت استعادة الحساب بنجاح.'
          : 'تم تسجيل الدخول بنجاح — مرحباً بك في سودان فونز.',
      en:
        otpOrigin === 'recovery'
          ? 'Account recovered successfully.'
          : 'Signed in — welcome to Sudan Phones.',
    });

    onEnterAppSignedIn({
      name: fullName.trim() || (lang === 'ar' ? 'وليد الصادق' : 'Waleed Al-Sadiq'),
      phone: `${effectiveDialCode} ${phoneDigits || selectedCountry.placeholder}`,
      accountType,
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="auth-theme relative w-full max-w-full h-full overflow-hidden touch-pan-y"
        data-theme={activeTheme}
      >
        <AnimatePresence mode="wait">
        {/* ===================================================================
         * 0. LAUNCH INTRO -> MORPHS SMOOTHLY TO FIRST PAGE (WELCOME)
         * ================================================================= */}
        {screen === 'launch' && (
          <motion.div
            key="launch"
            onClick={() => onNavigate('welcome')}
            role="button"
            tabIndex={0}
            aria-label={tText(AUTH_COPY.skipLaunchAria, lang)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('welcome');
            }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-10 cursor-pointer select-none bg-[#0A130E]"
          >
            <ForestPhonesBackdrop variant="full" className="opacity-55" />
            <div className="h-6" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6"
              >
                <AuthLogoTile animated />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="text-[28px] leading-[36px] font-bold text-white"
              >
                {tText(AUTH_COPY.brandName, lang)}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-[14px] leading-[20px] text-[#C5D6CC] mt-2"
              >
                {tText(AUTH_COPY.brandTagline, lang)}
              </motion.p>
            </div>

            <div className="relative z-10 w-full max-w-[180px] flex flex-col items-center gap-3">
              <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.65, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: lang === 'ar' ? '100% 50%' : '0% 50%' }}
                  className="h-full w-full bg-[#B7DFC5] rounded-full"
                />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65, duration: 0.35 }}
                className="text-[13px] leading-[18px] text-[#B7C9BE]"
              >
                {tText(AUTH_COPY.pilotCities, lang)}
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
         * 1. LOGIN SCREEN — Curved Forest-Phones Banner + Crisp Sage Form
         * ================================================================= */}
        {screen === 'signin' && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col h-full overflow-hidden bg-[var(--bg)]"
          >
            {/* Subtle Living Ambient Sage/Emerald Background Auras behind the Login Canvas */}
            {!prefersReducedMotion && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
              >
                <motion.div
                  animate={{
                    x: [0, 22, -14, 0],
                    y: [0, -18, 12, 0],
                    scale: [1, 1.12, 0.96, 1],
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-[28%] -start-24 w-[280px] h-[280px] rounded-full will-change-transform"
                  style={{
                    backgroundImage:
                      activeTheme === 'dark'
                        ? 'radial-gradient(circle, rgba(88, 184, 134, 0.14) 0%, rgba(45, 212, 160, 0.04) 48%, transparent 72%)'
                        : 'radial-gradient(circle, rgba(53, 97, 71, 0.12) 0%, rgba(184, 223, 198, 0.14) 45%, transparent 72%)',
                  }}
                />
                <motion.div
                  animate={{
                    x: [0, -24, 16, 0],
                    y: [0, 20, -14, 0],
                    scale: [1, 0.94, 1.1, 1],
                  }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-[6%] -end-20 w-[300px] h-[300px] rounded-full will-change-transform"
                  style={{
                    backgroundImage:
                      activeTheme === 'dark'
                        ? 'radial-gradient(circle, rgba(61, 115, 84, 0.18) 0%, rgba(31, 74, 51, 0.05) 50%, transparent 74%)'
                        : 'radial-gradient(circle, rgba(164, 212, 183, 0.24) 0%, rgba(53, 97, 71, 0.06) 52%, transparent 74%)',
                  }}
                />
              </div>
            )}

            {/* Scrollable Body including Curved Header Banner */}
            <form
              onSubmit={handlePasswordSignIn}
              noValidate
              className="relative z-10 flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden thin-scroll flex flex-col justify-between auth-safe-bottom touch-pan-y"
            >
              <div>
                {/* Top Macro Phones Photo — True Alpha Mask Fade (Zero Seam Line in Light & Dark) */}
                <div className="relative h-[246px] w-full shrink-0">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    style={{
                      WebkitMaskImage:
                        'linear-gradient(180deg, #000 0%, #000 28%, rgba(0, 0, 0, 0.72) 50%, rgba(0, 0, 0, 0.24) 74%, rgba(0, 0, 0, 0) 95%, rgba(0, 0, 0, 0) 100%)',
                      maskImage:
                        'linear-gradient(180deg, #000 0%, #000 28%, rgba(0, 0, 0, 0.72) 50%, rgba(0, 0, 0, 0.24) 74%, rgba(0, 0, 0, 0) 95%, rgba(0, 0, 0, 0) 100%)',
                    }}
                  >
                    <ForestPhonesBackdrop variant="banner" ambientMotion />
                  </div>

                  {/* Overlaid Top Bar: Circular Back (start) + Dark Pill Language & Theme (end) */}
                  <div className="relative z-20 px-4 pt-3.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        onNavigate('welcome');
                      }}
                      aria-label={tText(AUTH_COPY.back, lang)}
                      className="auth-focus-ring w-[42px] h-[42px] rounded-full bg-[#E6EEE8]/95 hover:bg-white text-[#1F4A33] flex items-center justify-center shadow-sm active:scale-95 transition-all"
                    >
                      <BackIcon className="w-5 h-5 stroke-[2.2]" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                        aria-label={tText(AUTH_COPY.langToggleAria, lang)}
                        className="auth-focus-ring min-h-[38px] px-3.5 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/15 text-white text-[13px] leading-[18px] font-medium inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-white/90 shrink-0" aria-hidden="true" />
                        <span>{tText(AUTH_COPY.langToggleLabel, lang)}</span>
                      </button>

                    </div>
                  </div>
                </div>

                {/* Main Login Content Area (Overlaps Gently into the Faded Photo Zone) */}
                <div className="relative z-10 -mt-14 px-6 pt-2 pb-4">
                  {/* Floating Tilted Corner Phone Accent */}
                  <FloatingCornerPhone
                    lang={lang}
                    className="absolute top-1 -end-5 z-0 opacity-95"
                  />

                  {/* Centered Welcome Back Heading */}
                  <div className="relative z-10 text-center space-y-1 mb-5">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={accountType}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <h1 className="text-[28px] leading-[36px] font-bold tracking-[-0.015em] text-[var(--heading)]">
                          {accountType === 'merchant'
                            ? tText(AUTH_COPY.loginTitleMerchant, lang)
                            : tText(AUTH_COPY.loginTitleCustomer, lang)}
                        </h1>
                        <p className="text-[14px] leading-[20px] text-[var(--text-secondary)] mt-1">
                          {accountType === 'merchant'
                            ? tText(AUTH_COPY.loginSubtitleMerchant, lang)
                            : tText(AUTH_COPY.loginSubtitleCustomer, lang)}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Underlined Auth Method Tabs: Phone (+249) | Email */}
                  <div
                    role="tablist"
                    className="relative z-10 flex items-center justify-center gap-6 mb-5"
                  >
                    {(
                      [
                        { id: 'phone', label: tText(AUTH_COPY.loginTabPhone, lang) },
                        { id: 'email', label: tText(AUTH_COPY.loginTabEmail, lang) },
                      ] as const
                    ).map((tabItem) => {
                      const active = loginMethod === tabItem.id;
                      return (
                        <button
                          key={tabItem.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => {
                            setLoginMethod(tabItem.id);
                            clearError();
                          }}
                          className={`auth-focus-ring relative min-h-[40px] px-1 text-[14px] leading-[20px] font-semibold transition-colors whitespace-nowrap ${
                            active
                              ? 'text-[var(--heading)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                          }`}
                        >
                          <span>{tabItem.label}</span>
                          {active && (
                            <motion.span
                              layoutId="login-method-underline"
                              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                              className="absolute bottom-1 inset-x-0 h-[2px] rounded-full bg-[var(--brand)]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Soft Sage Form Fields */}
                  <div className="relative z-10 space-y-3.5">
                    <AnimatePresence mode="wait" initial={false}>
                      {loginMethod === 'phone' ? (
                        <motion.div
                          key="signin-phone-tab"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.16 }}
                        >
                          <AuthPhoneField
                            id="auth-signin-phone"
                            label={tText(AUTH_COPY.phoneLabel, lang)}
                            hideLabel
                            lang={lang}
                            dialCode={dialCode}
                            onDialCodeChange={handleDialCodeChange}
                            value={phoneDigits}
                            onChange={(next) => {
                              setPhoneDigits(formatPhoneByDialCode(next, dialCode));
                              clearError();
                            }}
                            onClear={() => {
                              setPhoneDigits('');
                              clearError();
                            }}
                            placeholder={selectedCountry.placeholder}
                            carrierLabel={carrierLabel}
                            error={errorField === 'phone' ? formError : undefined}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="signin-email-tab"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.16 }}
                        >
                          <AuthInputField
                            id="auth-signin-email"
                            label={tText(AUTH_COPY.emailLabel, lang)}
                            hideLabel
                            lang={lang}
                            type="email"
                            dir="ltr"
                            autoComplete="email"
                            value={loginEmail}
                            onChange={(next) => {
                              setLoginEmail(next);
                              clearError();
                            }}
                            placeholder={tText(AUTH_COPY.emailPlaceholder, lang)}
                            leadingIcon={<Mail className="w-[18px] h-[18px]" />}
                            error={errorField === 'email' ? formError : undefined}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Password Field (Full Width — Clean, Focused) */}
                    <div>
                      <AuthInputField
                        id="auth-signin-password"
                        label={tText(AUTH_COPY.passwordLabel, lang)}
                        hideLabel
                        lang={lang}
                        type="password"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(next) => {
                          setLoginPassword(next);
                          clearError();
                        }}
                        placeholder={tText(AUTH_COPY.passwordPlaceholder, lang)}
                        leadingIcon={<Lock className="w-[18px] h-[18px]" />}
                        passwordToggle={{
                          shown: showLoginPassword,
                          onToggle: () => setShowLoginPassword((s) => !s),
                          showLabel: tText(AUTH_COPY.showPassword, lang),
                          hideLabel: tText(AUTH_COPY.hidePassword, lang),
                        }}
                        error={errorField === 'loginPassword' ? formError : undefined}
                      />

                      {/* Remember Me (round forest check) + Forgot Password */}
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <label className="auth-focus-ring min-h-[44px] inline-flex items-center gap-2 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="sr-only peer"
                          />
                          <motion.span
                            aria-hidden="true"
                            animate={{ scale: rememberMe ? [0.88, 1] : 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                            className={`w-[20px] h-[20px] rounded-full border flex items-center justify-center transition-colors duration-200 ${
                              rememberMe
                                ? 'bg-[var(--brand)] border-[var(--brand)] text-[var(--on-brand)]'
                                : 'bg-transparent border-[var(--border-strong)] text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </motion.span>
                          <span className="text-[13px] leading-[18px] font-medium text-[var(--text-secondary)]">
                            {tText(AUTH_COPY.rememberMe, lang)}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            clearError();
                            onNavigate('recovery');
                          }}
                          className="auth-focus-ring min-h-[44px] px-1 inline-flex items-center text-[13px] leading-[18px] font-semibold text-[var(--heading)] hover:text-[var(--brand)] transition-colors"
                        >
                          {tText(AUTH_COPY.forgotPassword, lang)}
                        </button>
                      </div>
                    </div>

                    {formError && errorField === null && <AuthFieldError message={formError} />}
                  </div>
                </div>
              </div>

              {/* Bottom Pill CTA + Clean Footer */}
              <div className="px-6 pt-3 pb-4 space-y-3">
                <AuthPrimaryButton
                  type="submit"
                  lang={lang}
                  disabled={loadingMode !== null}
                  loading={loadingMode === 'password'}
                >
                  <span>{tText(AUTH_COPY.signInCta, lang)}</span>
                </AuthPrimaryButton>

                {!isKeyboardOpen && (
                  <footer className="flex flex-col items-center text-center pt-3 mt-1 space-y-3">
                    {/* Soft Tapered Hairline Separator */}
                    <div
                      aria-hidden="true"
                      className="w-4/5 h-px opacity-75"
                      style={{
                        backgroundImage:
                          'linear-gradient(90deg, transparent 0%, var(--border-strong) 50%, transparent 100%)',
                      }}
                    />

                    <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-[14px] leading-[20px]">
                      <span className="text-[var(--text)] font-medium">
                        {tText(AUTH_COPY.noAccountPrompt, lang)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          clearError();
                          onNavigate('register');
                        }}
                        className="auth-focus-ring min-h-[40px] px-1.5 inline-flex items-center font-bold text-[var(--brand)] underline decoration-2 underline-offset-4 hover:text-[var(--heading)] transition-colors"
                      >
                        {tText(AUTH_COPY.createAccountLink, lang)}
                      </button>
                    </div>

                    <div className="w-full flex flex-wrap items-stretch gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={onEnterAppAsGuest}
                        className="auth-focus-ring flex-1 min-w-fit min-h-[44px] px-3.5 rounded-full bg-[var(--surface)] hover:bg-[var(--field-hover)] border border-[var(--border-strong)] hover:border-[var(--brand)] text-[var(--heading)] text-[12.5px] leading-[18px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Smartphone className="w-4 h-4 text-[var(--brand)] shrink-0" aria-hidden="true" />
                        <span>{tText(AUTH_COPY.browseAsGuest, lang)}</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setAccountType((prev) => (prev === 'customer' ? 'merchant' : 'customer'));
                          clearError();
                        }}
                        className="auth-focus-ring flex-1 min-w-fit min-h-[44px] px-3.5 rounded-full bg-[var(--success-bg)] hover:bg-[var(--field-hover)] border border-[var(--brand)]/40 hover:border-[var(--brand)] text-[var(--heading)] text-[12.5px] leading-[18px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Store className="w-4 h-4 text-[var(--brand)] shrink-0" aria-hidden="true" />
                        <span>
                          {accountType === 'customer'
                            ? tText(AUTH_COPY.merchantLoginLink, lang)
                            : tText(AUTH_COPY.buyerLoginLink, lang)}
                        </span>
                      </motion.button>
                    </div>
                  </footer>
                )}
              </div>
            </form>
          </motion.div>
        )}

        {/* ===================================================================
         * 2. CREATE ACCOUNT & STORE REGISTRATION SCREEN
         * Clean White/Dark Canvas + Circular Sage Back + Corner Floating Phone
         * Centered Title + Segmented Buyer/Shop Pill + Soft Sage Inputs +
         * Pill CTA + IMEI Policy Checkbox + Circular Social Row + Sign In Footer
         * ================================================================= */}
        {screen === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col h-full overflow-hidden bg-[var(--bg)]"
          >
            {/* Floating Tilted Corner Phone Accent */}
            <FloatingCornerPhone
              lang={lang}
              className="absolute top-2 -end-5 z-0 opacity-95"
            />

            {/* Minimal Top Bar: Circular Sage Back Button */}
            <header className="relative z-10 px-5 pt-3.5 pb-1 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  onNavigate('welcome');
                }}
                aria-label={tText(AUTH_COPY.back, lang)}
                className="auth-focus-ring w-[42px] h-[42px] rounded-full bg-[var(--field)] hover:bg-[var(--field-hover)] text-[var(--heading)] flex items-center justify-center active:scale-95 transition-all shrink-0"
              >
                <BackIcon className="w-5 h-5 stroke-[2.2]" />
              </button>

              <div className="w-[42px] shrink-0" aria-hidden="true" />
            </header>

            {/* Scrollable Register Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestOtp('register', otpChannel);
              }}
              noValidate
              className="relative z-10 flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden thin-scroll px-6 pt-1 pb-6 auth-safe-bottom flex flex-col justify-between gap-5 touch-pan-y"
            >
              <div className="space-y-4">
                {/* Centered Title & Subtitle */}
                <div className="text-center space-y-1">
                  <h1 className="text-[28px] leading-[36px] font-bold tracking-[-0.015em] text-[var(--heading)]">
                    {tText(AUTH_COPY.createAccountTitle, lang)}
                  </h1>
                  <p className="text-[14px] leading-[20px] text-[var(--text-secondary)]">
                    {accountType === 'merchant'
                      ? tText(AUTH_COPY.createAccountSubtitleMerchant, lang)
                      : tText(AUTH_COPY.createAccountSubtitleCustomer, lang)}
                  </p>
                </div>

                {/* Segmented Pill Toggle: Personal Buyer | Phone Shop */}
                <div
                  role="tablist"
                  className="grid grid-cols-2 p-1 rounded-full bg-[var(--field)]"
                >
                  {(
                    [
                      {
                        id: 'customer',
                        label: tText(AUTH_COPY.rolePersonalBuyer, lang),
                        icon: User,
                      },
                      {
                        id: 'merchant',
                        label: tText(AUTH_COPY.rolePhoneShop, lang),
                        icon: Store,
                      },
                    ] as const
                  ).map((role) => {
                    const active = accountType === role.id;
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => handleSelectAccountRole(role.id)}
                        className={`auth-focus-ring relative min-h-[42px] px-3 rounded-full text-[13.5px] leading-[18px] font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                          active
                            ? 'text-[var(--heading)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="register-role-pill"
                            transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                            className="absolute inset-0 rounded-full bg-[var(--bg)] shadow-sm"
                          />
                        )}
                        <Icon className="relative z-10 w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="relative z-10 truncate">{role.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Soft Sage Input Fields */}
                <div className="space-y-3">
                  <AuthInputField
                    id="auth-reg-name"
                    label={tText(AUTH_COPY.fullNameLabel, lang)}
                    hideLabel
                    required
                    lang={lang}
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(next) => {
                      setFullName(next);
                      clearError();
                    }}
                    placeholder={tText(AUTH_COPY.fullNamePlaceholder, lang)}
                    leadingIcon={<User className="w-[18px] h-[18px]" />}
                    error={errorField === 'fullName' ? formError : undefined}
                  />

                  <AuthPhoneField
                    id="auth-reg-phone"
                    label={
                      isMerchantRegister
                        ? tText(AUTH_COPY.phoneLabelMerchant, lang)
                        : tText(AUTH_COPY.phoneLabel, lang)
                    }
                    hideLabel
                    required
                    lang={lang}
                    dialCode={effectiveDialCode}
                    lockedSudanOnly={isMerchantRegister}
                    onDialCodeChange={handleDialCodeChange}
                    value={phoneDigits}
                    onChange={(next) => {
                      setPhoneDigits(formatPhoneByDialCode(next, effectiveDialCode));
                      clearError();
                    }}
                    onClear={() => {
                      setPhoneDigits('');
                      clearError();
                    }}
                    placeholder={selectedCountry.placeholder}
                    carrierLabel={carrierLabel}
                    error={errorField === 'phone' ? formError : undefined}
                  />

                  <AuthSelectField
                    id="auth-reg-state"
                    label={tText(AUTH_COPY.stateLabel, lang)}
                    hideLabel
                    required
                    lang={lang}
                    value={regCity}
                    onChange={(next) => handleCitySelection(next as CityId)}
                    options={stateOptions}
                    placeholder={tText(AUTH_COPY.selectCityPlaceholder, lang)}
                    leadingIcon={<MapPin className="w-[18px] h-[18px]" />}
                  />

                  <AuthInputField
                    id="auth-reg-password"
                    label={tText(AUTH_COPY.passwordLabel, lang)}
                    hideLabel
                    required
                    lang={lang}
                    type="password"
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(next) => {
                      setRegPassword(next);
                      clearError();
                    }}
                    placeholder={tText(AUTH_COPY.newPasswordPlaceholder, lang)}
                    leadingIcon={<Lock className="w-[18px] h-[18px]" />}
                    passwordToggle={{
                      shown: showRegPassword,
                      onToggle: () => setShowRegPassword((s) => !s),
                      showLabel: tText(AUTH_COPY.showPassword, lang),
                      hideLabel: tText(AUTH_COPY.hidePassword, lang),
                    }}
                    helperText={
                      regPassword ? <PasswordStrengthMeter password={regPassword} lang={lang} /> : undefined
                    }
                    error={errorField === 'regPassword' ? formError : undefined}
                  />
                </div>

                {/* Expandable Store Registration Details when Phone Shop is selected */}
                <AnimatePresence initial={false}>
                  {accountType === 'merchant' && (
                    <motion.section
                      ref={storeSectionRef}
                      key="merchant-store-section"
                      aria-label={tText(AUTH_COPY.storeInfoTitle, lang)}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-[20px] bg-[var(--surface)] border border-[var(--border)] p-4 space-y-4 mt-1">
                        {/* Section Header */}
                        <div className="flex items-start gap-2.5 text-start">
                          <div className="w-9 h-9 rounded-[11px] bg-[var(--success-bg)] text-[var(--brand)] flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="text-[16px] leading-[22px] font-bold text-[var(--heading)]">
                              {tText(AUTH_COPY.storeInfoTitle, lang)}
                            </h3>
                            <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)]">
                              {tText(AUTH_COPY.storeInfoHelper, lang)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <AuthInputField
                            id="auth-reg-store-name"
                            label={tText(AUTH_COPY.storeNameLabel, lang)}
                            required
                            lang={lang}
                            type="text"
                            value={storeName}
                            onChange={(next) => {
                              setStoreName(next);
                              clearError();
                            }}
                            placeholder={tText(AUTH_COPY.storeNamePlaceholder, lang)}
                            leadingIcon={<Store className="w-[18px] h-[18px]" />}
                            error={errorField === 'storeName' ? formError : undefined}
                          />

                          {/* Certificate Upload */}
                          <div className="w-full">
                            <AuthFieldLabel
                              label={tText(AUTH_COPY.certificateLabel, lang)}
                              required
                              lang={lang}
                            />

                            <input
                              ref={certInputRef}
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleCertificateFileChange}
                              className="sr-only"
                            />

                            {certificateFile ? (
                              <div className="p-3 rounded-[14px] bg-[var(--field)] border border-[var(--brand)]/50 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {certificateFile.previewUrl ? (
                                    <img
                                      src={certificateFile.previewUrl}
                                      alt={certificateFile.name}
                                      className="w-11 h-11 rounded-[10px] object-cover border border-[var(--border)] shrink-0"
                                    />
                                  ) : (
                                    <div className="w-11 h-11 rounded-[10px] bg-[var(--success-bg)] border border-[var(--brand)]/30 text-[var(--brand)] flex flex-col items-center justify-center shrink-0">
                                      <FileText className="w-5 h-5" aria-hidden="true" />
                                      <span className="text-[9px] font-bold leading-none mt-0.5">
                                        {certificateFile.extLabel}
                                      </span>
                                    </div>
                                  )}
                                  <div className="min-w-0 text-start">
                                    <p className="text-[13.5px] leading-[19px] font-semibold text-[var(--text)] truncate">
                                      {certificateFile.name}
                                    </p>
                                    <p className="text-[12px] leading-[17px] text-[var(--text-secondary)] tabular-nums">
                                      {certificateFile.isSample
                                        ? tText(AUTH_COPY.sampleCertFileSize, lang)
                                        : formatAuthFileSize(certificateFile.sizeBytes, lang)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleRemoveCertificate}
                                  aria-label={tText(AUTH_COPY.removeFile, lang)}
                                  className="auth-focus-ring min-w-[44px] min-h-[44px] rounded-[12px] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] flex items-center justify-center shrink-0 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => certInputRef.current?.click()}
                                  className={`auth-focus-ring w-full p-3.5 rounded-[14px] border-[1.5px] border-dashed flex items-center gap-3 text-start transition-colors ${
                                    errorField === 'certificate'
                                      ? 'bg-[var(--danger-bg)] border-[var(--danger)]'
                                      : 'bg-[var(--field)] border-[var(--border-strong)] hover:border-[var(--brand)] hover:bg-[var(--field-hover)]'
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-[11px] bg-[var(--bg)] border border-[var(--border)] text-[var(--brand)] flex items-center justify-center shrink-0">
                                    <FileUp className="w-5 h-5" aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-[13.5px] leading-[19px] font-semibold text-[var(--text)]">
                                      {tText(AUTH_COPY.uploadCertTitle, lang)}
                                    </p>
                                    <p className="text-[12px] leading-[17px] text-[var(--text-secondary)]">
                                      {tText(AUTH_COPY.uploadCertHelper, lang)}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleAttachSampleCertificate}
                                  className="auth-focus-ring mt-0.5 min-h-[44px] px-1 inline-flex items-center gap-2 text-[13.5px] leading-[19px] font-semibold text-[var(--brand)] hover:underline underline-offset-4 transition-colors"
                                >
                                  <Paperclip className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  <span>{tText(AUTH_COPY.attachSampleCert, lang)}</span>
                                </button>
                              </div>
                            )}

                            {errorField === 'certificate' && (
                              <AuthFieldError message={formError} />
                            )}
                          </div>

                          {/* Detailed Address */}
                          <AuthTextAreaField
                            id="auth-reg-store-address"
                            label={tText(AUTH_COPY.detailedAddressLabel, lang)}
                            required
                            lang={lang}
                            rows={2}
                            value={storeAddress}
                            onChange={(next) => {
                              setStoreAddress(next);
                              clearError();
                            }}
                            placeholder={tText(AUTH_COPY.detailedAddressPlaceholder, lang)}
                            leadingIcon={<MapPin className="w-[18px] h-[18px]" />}
                            error={errorField === 'storeAddress' ? formError : undefined}
                          />

                          {/* Map Location Button Field */}
                          <div className="w-full">
                            <AuthFieldLabel
                              label={tText(AUTH_COPY.mapLocationLabel, lang)}
                              required
                              lang={lang}
                            />

                            {pickedMapLocation ? (
                              <div className="min-h-[54px] px-3.5 py-2.5 rounded-[14px] bg-[var(--field)] border border-[var(--brand)]/50 flex items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0 text-start">
                                  <MapPin
                                    className="w-5 h-5 text-[var(--brand)] shrink-0 mt-0.5"
                                    aria-hidden="true"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[14px] leading-[20px] font-semibold text-[var(--text)] truncate">
                                      {lang === 'ar'
                                        ? pickedMapLocation.labelAr
                                        : pickedMapLocation.labelEn}
                                    </p>
                                    <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)] truncate">
                                      {formatCity(regCity, lang)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleOpenMapPicker}
                                  className="auth-focus-ring min-h-[44px] px-2 rounded-[10px] text-[13.5px] leading-[18px] font-semibold text-[var(--brand)] hover:bg-[var(--success-bg)] shrink-0 transition-colors"
                                >
                                  {tText(AUTH_COPY.change, lang)}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleOpenMapPicker}
                                className={`auth-focus-ring w-full min-h-[52px] px-4 rounded-[14px] border flex items-center justify-between gap-3 text-start transition-colors ${
                                  errorField === 'mapLocation'
                                    ? 'bg-[var(--danger-bg)] border-[var(--danger)]'
                                    : 'bg-[var(--field)] border-transparent hover:bg-[var(--field-hover)]'
                                }`}
                              >
                                <span className="flex items-center gap-3 min-w-0">
                                  <MapPin
                                    className="w-5 h-5 text-[var(--brand)] shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span className="text-[14.5px] leading-[20px] font-medium text-[var(--text)] truncate">
                                    {tText(AUTH_COPY.pickFromMap, lang)}
                                  </span>
                                </span>
                                <EndChevron
                                  className="w-5 h-5 text-[var(--text-secondary)] shrink-0"
                                  aria-hidden="true"
                                />
                              </button>
                            )}

                            {errorField === 'mapLocation' ? (
                              <AuthFieldError message={formError} />
                            ) : (
                              <p className="text-[12.5px] leading-[17px] text-[var(--text-secondary)] pt-1.5 text-start">
                                {tText(AUTH_COPY.mapPickerHelper, lang)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

                {/* Primary Pill CTA */}
                <div className="pt-1 space-y-2.5">
                  <AuthPrimaryButton
                    type="submit"
                    lang={lang}
                    disabled={loadingMode !== null}
                    loading={loadingMode === 'merchant' || loadingMode === 'whatsapp'}
                  >
                    <span>
                      {accountType === 'merchant'
                        ? tText(AUTH_COPY.registerStoreSubmit, lang)
                        : tText(AUTH_COPY.createAccountSubmit, lang)}
                    </span>
                  </AuthPrimaryButton>

                  {/* Terms & IMEI Fair-Trade Policy Checkbox Row */}
                  <div>
                    <label className="auth-focus-ring min-h-[40px] flex items-center justify-between gap-2 cursor-pointer select-none">
                      <span className="inline-flex items-center gap-2 shrink-0">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => {
                            setAgreedToTerms(e.target.checked);
                            clearError();
                          }}
                          className="sr-only peer"
                        />
                        <motion.span
                          aria-hidden="true"
                          animate={{ scale: agreedToTerms ? [0.88, 1] : 1 }}
                          transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                          className={`w-[19px] h-[19px] rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                            agreedToTerms
                              ? 'bg-[var(--brand)] border-[var(--brand)] text-[var(--on-brand)]'
                              : 'bg-transparent border-[var(--border-strong)] text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </motion.span>
                        <span className="text-[12px] leading-[17px] text-[var(--text-secondary)]">
                          {tText(AUTH_COPY.agreePrefix, lang)}
                        </span>
                      </span>
                      <span className="text-[12px] leading-[17px] font-semibold text-[var(--heading)] text-end">
                        {tText(AUTH_COPY.termsImeiPolicy, lang)}
                      </span>
                    </label>
                    {errorField === 'terms' && <AuthFieldError message={formError} />}
                  </div>

                  {formError && errorField === null && <AuthFieldError message={formError} />}
                </div>
              </div>

              {/* Divider + Circular Social Icons + Already Have Account Footer */}
              {!isKeyboardOpen && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center gap-3" role="separator">
                    <div className="auth-hairline-divider flex-1" />
                    <span className="text-[12px] leading-[16px] text-[var(--text-secondary)] whitespace-nowrap">
                      {tText(AUTH_COPY.orContinueWith, lang)}
                    </span>
                    <div className="auth-hairline-divider flex-1" />
                  </div>

                  {/* 3 Circular Social Buttons (WhatsApp, Google, Apple) */}
                  <div className="flex items-center justify-center gap-4">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      disabled={loadingMode !== null}
                      onClick={() => requestOtp('register', 'whatsapp')}
                      aria-label={tText(AUTH_COPY.continueWhatsApp, lang)}
                      className="auth-focus-ring w-[48px] h-[48px] rounded-full bg-[var(--social-bg)] border border-[var(--social-border)] shadow-xs hover:border-[var(--brand)] flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <WhatsAppIcon className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      disabled={loadingMode !== null}
                      onClick={handleGoogleContinue}
                      aria-label={tText(AUTH_COPY.continueGoogle, lang)}
                      className="auth-focus-ring w-[48px] h-[48px] rounded-full bg-[var(--social-bg)] border border-[var(--social-border)] shadow-xs hover:border-[var(--brand)] flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {loadingMode === 'google' ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-[var(--brand)]" />
                      ) : (
                        <GoogleIcon className="w-5 h-5" />
                      )}
                    </motion.button>
                  </div>

                  {/* Already have an account? Sign In */}
                  <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-[13.5px] leading-[20px]">
                    <span className="text-[var(--text-secondary)]">
                      {tText(AUTH_COPY.alreadyHaveAccount, lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        onNavigate('signin');
                      }}
                      className="auth-focus-ring min-h-[44px] px-1 inline-flex items-center font-semibold text-[var(--heading)] underline underline-offset-4 hover:text-[var(--brand)] transition-colors"
                    >
                      {tText(AUTH_COPY.signInCta, lang)}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        )}

        {/* ===================================================================
         * 3. FIRST PAGE / WELCOME SCREEN
         * Photorealistic studio matte forest-green smartphones backdrop,
         * unobstructed upper visual canvas, crisp brand header + glass controls,
         * lower-middle editorial hero typography, and luminous frosted glass CTA
         * ================================================================= */}
        {screen === 'welcome' && (
          <motion.div
            key="welcome"
            onPointerMove={handleWelcomePointerMove}
            onPointerLeave={handleWelcomePointerLeave}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col h-full justify-between overflow-hidden bg-[#08100C] text-white"
          >
            {/* Living Full-Bleed Studio Macro Matte Forest-Green Smartphones Photograph */}
            <ForestPhonesBackdrop
              variant="full"
              ambientMotion
              parallaxX={backdropParallaxX}
              parallaxY={backdropParallaxY}
            />

            {/* Minimal Top Header Bar: Animated Brand Emblem + Wordmark (start) & Frosted Controls (end) */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 px-5 pt-3.5 pb-2 flex items-center justify-between gap-2 shrink-0"
            >
              <div className="min-h-[44px] inline-flex items-center gap-2 select-none">
                <BrandMark
                  animated
                  className="w-6 h-6 text-white shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                />
                <span className="text-[16px] leading-[22px] font-semibold tracking-[-0.01em] text-white whitespace-nowrap drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
                  {tText(AUTH_COPY.brandName, lang)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                  aria-label={tText(AUTH_COPY.langToggleAria, lang)}
                  className="auth-focus-ring min-h-[40px] px-3.5 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-xl border border-white/15 text-white text-[13px] leading-[18px] font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[#B8DFC6] shrink-0" aria-hidden="true" />
                  <span>{tText(AUTH_COPY.langToggleLabel, lang)}</span>
                </motion.button>

              </div>
            </motion.header>

            {/* Middle Focal Centerpiece: Kinetic Vertical Letter-Scrolling Brand Showcase */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={prefersReducedMotion ? undefined : { x: heroParallaxX, y: heroParallaxY }}
              className="relative z-10 flex-1 flex items-center justify-center px-6 will-change-transform"
            >
              <HeroBrandRoller lang={lang} />
            </motion.div>

            {/* Lower-Half Editorial Hero & Thumb-Zone Actions */}
            <div className="relative z-10 shrink-0 flex flex-col justify-end px-6 pb-6 auth-safe-bottom gap-5">
              {/* Editorial Typography Block with Masked Line-by-Line Reveal & Subtle Counter-Parallax */}
              <motion.div
                style={prefersReducedMotion ? undefined : { x: heroParallaxX, y: heroParallaxY }}
                className="space-y-2.5 text-start will-change-transform"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                  <p className="text-[12.5px] leading-[18px] font-medium text-[#B8DFC6] tracking-[0.01em]">
                    {tText(AUTH_COPY.pilotCities, lang)}
                  </p>
                  <motion.div
                    aria-hidden="true"
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 0.7 }}
                    transition={{ duration: 0.65, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: lang === 'ar' ? '100% 50%' : '0% 50%' }}
                    className={`h-[1.5px] w-10 rounded-full ${
                      lang === 'ar' ? 'bg-gradient-to-l' : 'bg-gradient-to-r'
                    } from-[#B8DFC6] to-transparent`}
                  />
                </motion.div>

                <h1 className="text-[36px] leading-[42px] font-bold tracking-[-0.025em] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
                  <span className="block overflow-hidden pb-0.5">
                    <motion.span
                      className="block will-change-transform"
                      initial={{ y: '108%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      transition={{ duration: 0.62, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {tText(AUTH_COPY.firstPageHeroLine1, lang)}
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-0.5">
                    <motion.span
                      className="block will-change-transform"
                      initial={{ y: '108%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      transition={{ duration: 0.62, delay: 0.21, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {tText(AUTH_COPY.firstPageHeroLine2, lang)}
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      className="block text-[#B8DFC6] will-change-transform"
                      initial={{ y: '108%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      transition={{ duration: 0.68, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {tText(AUTH_COPY.firstPageHeroHighlight, lang)}
                    </motion.span>
                  </span>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.52, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[14px] leading-[22px] text-white/75 max-w-[30ch]"
                >
                  {tText(AUTH_COPY.firstPageSubtitle, lang)}
                </motion.p>
              </motion.div>

              {/* Luminous Frosted Glass Pill CTA (with Periodic Light Sheen) + Clean Account & Utility Links */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.012 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    clearError();
                    onNavigate('signin');
                  }}
                  className="group relative overflow-hidden auth-focus-ring w-full min-h-[54px] px-6 rounded-full bg-white/[0.15] hover:bg-white/[0.24] backdrop-blur-xl border border-white/25 text-white text-[16px] leading-[24px] font-semibold flex items-center justify-center gap-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors duration-200"
                >
                  {/* Soft diagonal glass light sheen gliding periodically across the CTA */}
                  {!prefersReducedMotion && (
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: lang === 'ar' ? '460%' : '-140%', opacity: 0 }}
                      animate={{
                        x: lang === 'ar' ? ['460%', '-140%'] : ['-140%', '460%'],
                        opacity: [0, 0.55, 0.55, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 1.2,
                        repeat: Infinity,
                        repeatDelay: 4.4,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="pointer-events-none absolute inset-y-0 left-0 w-24 -skew-x-[24deg] will-change-transform"
                      style={{
                        backgroundImage:
                          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
                      }}
                    />
                  )}

                  <span className="relative z-10">{tText(AUTH_COPY.firstPageSignIn, lang)}</span>
                  <motion.span
                    aria-hidden="true"
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : {
                            x: lang === 'ar' ? [0, -3.5, 0] : [0, 3.5, 0],
                          }
                    }
                    transition={
                      prefersReducedMotion
                        ? undefined
                        : {
                            duration: 1.8,
                            delay: 1.1,
                            repeat: Infinity,
                            repeatDelay: 2.8,
                            ease: 'easeInOut',
                          }
                    }
                    className="relative z-10 inline-flex items-center"
                  >
                    <ForwardArrow
                      className={`w-4 h-4 stroke-[2.3] transition-transform duration-200 ${
                        lang === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'
                      }`}
                    />
                  </motion.span>
                </motion.button>

                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.44, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    clearError();
                    onNavigate('register');
                  }}
                  className="auth-focus-ring min-h-[44px] px-4 inline-flex items-center justify-center text-[15px] leading-[22px] font-semibold text-white/95 hover:text-[#B8DFC6] transition-colors"
                >
                  {tText(AUTH_COPY.firstPageCreateAccount, lang)}
                </motion.button>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.44, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-center gap-2 text-[12.5px] leading-[18px] text-white/65 -mt-1.5"
                >
                  <button
                    type="button"
                    onClick={onEnterAppAsGuest}
                    className="auth-focus-ring min-h-[40px] px-2 inline-flex items-center font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap"
                  >
                    {tText(AUTH_COPY.browseAsGuest, lang)}
                  </button>
                  <span aria-hidden="true" className="text-white/30 select-none">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={onOpenCitySheet}
                    className="auth-focus-ring min-h-[40px] px-2 inline-flex items-center gap-1 font-medium text-[#B8DFC6]/85 hover:text-[#B8DFC6] transition-colors whitespace-nowrap"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{formatCity(selectedCity, lang)}</span>
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
         * 4. 6-BOX OTP VERIFICATION SCREEN (Step 2 of 2)
         * ================================================================= */}
        {screen === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col h-full overflow-hidden"
          >
            <header className="px-4 pt-2 pb-2 flex items-center justify-between gap-2 shrink-0 border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => onNavigate(otpOrigin)}
                aria-label={tText(AUTH_COPY.back, lang)}
                className="auth-focus-ring w-[44px] h-[44px] rounded-full bg-[var(--field)] hover:bg-[var(--field-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] active:scale-95 transition-all shrink-0"
              >
                <BackIcon className="w-5 h-5" />
              </button>
              <h1 className="text-[18px] leading-[26px] font-semibold text-[var(--text)]">
                {tText(AUTH_COPY.otpHeader, lang)}
              </h1>
              <button
                type="button"
                onClick={() => onNavigate(otpOrigin)}
                className="auth-focus-ring min-h-[44px] px-2.5 rounded-[12px] text-[14px] leading-[20px] font-semibold text-[var(--brand)] hover:bg-[var(--success-bg)] transition-colors"
              >
                {tText(AUTH_COPY.edit, lang)}
              </button>
            </header>

            {otpOrigin === 'register' && (
              <div className="px-4 sm:px-5 pt-3 pb-1 shrink-0">
                <div className="grid grid-cols-2 gap-1.5" aria-hidden="true">
                  <div className="h-1 rounded-full bg-[var(--brand)]" />
                  <div className="h-1 rounded-full bg-[var(--brand)]" />
                </div>
              </div>
            )}

            <form
              onSubmit={verifyOtp}
              className="flex-1 min-h-0 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto thin-scroll px-4 sm:px-5 pt-6 pb-8 space-y-6">
                <div className="space-y-2 text-start">
                  <div className="w-12 h-12 rounded-[14px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--brand)]">
                    <KeyRound className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-[28px] leading-[36px] font-bold text-[var(--text)]">
                    {tText(AUTH_COPY.otpTitle, lang)}
                  </h2>
                  <p className="text-[14px] leading-[22px] text-[var(--text-secondary)]">
                    {otpChannel === 'whatsapp'
                      ? tText(AUTH_COPY.otpSentWhatsApp, lang)
                      : tText(AUTH_COPY.otpSentEmail, lang)}
                    <span dir="ltr" className="inline-block font-semibold tabular-nums text-[var(--text)]">
                      {otpChannel === 'email'
                        ? otpEmail
                        : `${effectiveDialCode} ${phoneDigits || selectedCountry.placeholder}`}
                    </span>
                  </p>
                  {otpChannel === 'email' && (
                    <p className="text-[13px] leading-[18px] text-[var(--warning)] bg-[var(--warning-bg)] border border-[var(--warning)]/30 rounded-[14px] px-3.5 py-2.5">
                      {tText(AUTH_COPY.otpEmailNote, lang)}
                    </p>
                  )}
                </div>

                {/* 6 Digit Tiles (no monospace, unified IBM Plex Sans Arabic tabular-nums) */}
                <div dir="ltr" className="grid grid-cols-6 gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      aria-label={`${tText(AUTH_COPY.otpDigitAria, lang)} ${idx + 1}`}
                      onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`min-h-[56px] w-full rounded-[14px] text-center text-[20px] font-bold tabular-nums focus:outline-none transition-all ${
                        otpError
                          ? 'bg-[var(--danger-bg)] border-2 border-[var(--danger)] text-[var(--danger)]'
                          : digit
                            ? 'bg-[var(--field)] border-2 border-[var(--brand)] text-[var(--text)]'
                            : 'bg-[var(--field)] border border-[var(--border)] focus:border-2 focus:border-[var(--border-focus)] text-[var(--text)]'
                      }`}
                    />
                  ))}
                </div>

                {otpError ? (
                  <div className="p-3.5 rounded-[14px] bg-[var(--danger-bg)] border border-[var(--danger)]/50 text-[13px] leading-[18px] text-[var(--danger)] flex items-start gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{otpError}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] leading-[18px] text-[var(--text-secondary)]">
                    <span>
                      {tText(AUTH_COPY.otpDemoLabel, lang)}{' '}
                      <span dir="ltr" className="inline-block font-semibold tabular-nums text-[var(--text)]">
                        123456
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpDigits(['1', '2', '3', '4', '5', '6']);
                          setOtpError('');
                        }}
                        className="auth-focus-ring min-h-[44px] px-1 font-semibold text-[var(--brand)] hover:underline underline-offset-4"
                      >
                        {tText(AUTH_COPY.otpFillDemo, lang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpDigits(['0', '0', '0', '0', '0', '0']);
                          setOtpError('');
                        }}
                        className="auth-focus-ring min-h-[44px] px-1 font-medium text-[var(--text-secondary)] hover:text-[var(--danger)]"
                      >
                        {tText(AUTH_COPY.otpTestError, lang)}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-[14px] leading-[20px]">
                  <span className="text-[var(--text-secondary)]">
                    {tText(AUTH_COPY.otpNotReceived, lang)}
                  </span>
                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={() => {
                      setCountdown(45);
                      pushToast('info', {
                        ar: 'تمت إعادة إرسال رمز التحقق.',
                        en: 'Verification code resent.',
                      });
                    }}
                    className="auth-focus-ring min-h-[44px] px-1 font-semibold tabular-nums text-[var(--brand)] disabled:text-[var(--placeholder)]"
                  >
                    {countdown > 0
                      ? lang === 'ar'
                        ? `إعادة الإرسال 00:${String(countdown).padStart(2, '0')}`
                        : `Resend in 00:${String(countdown).padStart(2, '0')}`
                      : tText(AUTH_COPY.otpResendNow, lang)}
                  </button>
                </div>
              </div>

              <div className="shrink-0 bg-[var(--bg)] border-t border-[var(--border-subtle)] px-4 sm:px-5 pt-3 auth-safe-bottom">
                <AuthPrimaryButton type="submit">
                  <span>{tText(AUTH_COPY.otpVerifyCta, lang)}</span>
                </AuthPrimaryButton>
              </div>
            </form>
          </motion.div>
        )}

        {/* ===================================================================
         * 5. ACCOUNT RECOVERY SCREEN
         * ================================================================= */}
        {screen === 'recovery' && (
          <motion.div
            key="recovery"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col h-full overflow-hidden"
          >
            <header className="px-4 pt-2 pb-2 flex items-center justify-between gap-2 shrink-0 border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  onNavigate('signin');
                }}
                aria-label={tText(AUTH_COPY.back, lang)}
                className="auth-focus-ring w-[44px] h-[44px] rounded-full bg-[var(--field)] hover:bg-[var(--field-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] active:scale-95 transition-all shrink-0"
              >
                <BackIcon className="w-5 h-5" />
              </button>
              <h1 className="text-[18px] leading-[26px] font-semibold text-[var(--text)]">
                {tText(AUTH_COPY.recoveryHeader, lang)}
              </h1>
              <div className="w-[44px] shrink-0" aria-hidden="true" />
            </header>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestOtp('recovery', otpChannel);
              }}
              noValidate
              className="flex-1 min-h-0 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto thin-scroll px-4 sm:px-5 pt-6 pb-8 space-y-6">
                <div className="space-y-2 text-start">
                  <h2 className="text-[28px] leading-[36px] font-bold text-[var(--text)]">
                    {tText(AUTH_COPY.recoveryTitle, lang)}
                  </h2>
                  <p className="text-[14px] leading-[20px] text-[var(--text-secondary)]">
                    {tText(AUTH_COPY.recoverySubtitle, lang)}
                  </p>
                </div>

                {/* Channel Selector: WhatsApp vs Email */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpChannel('whatsapp');
                      clearError();
                    }}
                    className={`auth-focus-ring min-h-[50px] px-3 rounded-[14px] border text-[14px] leading-[20px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                      otpChannel === 'whatsapp'
                        ? 'bg-[var(--success-bg)] border-[var(--brand)] text-[var(--brand)]'
                        : 'bg-[var(--field)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]'
                    }`}
                  >
                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                    <span>{tText(AUTH_COPY.viaWhatsApp, lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpChannel('email');
                      clearError();
                    }}
                    className={`auth-focus-ring min-h-[50px] px-3 rounded-[14px] border text-[14px] leading-[20px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                      otpChannel === 'email'
                        ? 'bg-[var(--success-bg)] border-[var(--brand)] text-[var(--brand)]'
                        : 'bg-[var(--field)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{tText(AUTH_COPY.viaEmail, lang)}</span>
                  </button>
                </div>

                {otpChannel === 'whatsapp' ? (
                  <AuthPhoneField
                    id="auth-recovery-phone"
                    label={tText(AUTH_COPY.registeredWhatsAppLabel, lang)}
                    lang={lang}
                    dialCode={dialCode}
                    onDialCodeChange={handleDialCodeChange}
                    value={phoneDigits}
                    onChange={(next) => {
                      setPhoneDigits(formatPhoneByDialCode(next, dialCode));
                      clearError();
                    }}
                    onClear={() => {
                      setPhoneDigits('');
                      clearError();
                    }}
                    placeholder={selectedCountry.placeholder}
                    carrierLabel={carrierLabel}
                    error={errorField === 'phone' ? formError : undefined}
                  />
                ) : (
                  <AuthInputField
                    id="auth-recovery-email"
                    label={tText(AUTH_COPY.registeredEmailLabel, lang)}
                    lang={lang}
                    type="email"
                    dir="ltr"
                    value={otpEmail}
                    onChange={(next) => {
                      setOtpEmail(next);
                      clearError();
                    }}
                    placeholder="name@example.com"
                    leadingIcon={<Mail className="w-[18px] h-[18px]" />}
                    helperText={tText(AUTH_COPY.otpEmailNote, lang)}
                    error={errorField === 'email' ? formError : undefined}
                  />
                )}
              </div>

              <div className="shrink-0 bg-[var(--bg)] border-t border-[var(--border-subtle)] px-4 sm:px-5 pt-3 auth-safe-bottom">
                <AuthPrimaryButton
                  type="submit"
                  disabled={loadingMode !== null}
                  loading={loadingMode !== null}
                >
                  <span>{tText(AUTH_COPY.sendRecoveryCta, lang)}</span>
                </AuthPrimaryButton>
              </div>
            </form>
          </motion.div>
        )}

        {/* ===================================================================
         * 6. MERCHANT REGISTRATION SUBMITTED — UNDER REVIEW CONFIRMATION
         * ================================================================= */}
        {screen === 'pending_review' && (
          <motion.div
            key="pending_review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col h-full overflow-hidden"
          >
            <header className="px-4 pt-2 pb-2 flex items-center justify-between gap-2 shrink-0 border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={onEnterAppAsGuest}
                aria-label={tText(AUTH_COPY.close, lang)}
                className="auth-focus-ring min-w-[44px] min-h-[44px] rounded-[12px] bg-[var(--surface)] hover:bg-[var(--field)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h1 className="text-[18px] leading-[26px] font-semibold text-[var(--text)]">
                {tText(AUTH_COPY.pendingHeader, lang)}
              </h1>
              <div className="w-[44px] shrink-0" aria-hidden="true" />
            </header>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto thin-scroll px-4 sm:px-5 pt-6 pb-8 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-20 h-20 rounded-[20px] bg-[var(--warning-bg)] border border-[var(--warning)]/40 flex items-center justify-center mb-4"
                  >
                    <Clock className="w-9 h-9 text-[var(--warning)]" aria-hidden="true" />
                    <div className="absolute -bottom-1.5 -end-1.5 w-7 h-7 rounded-full bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center ring-4 ring-[var(--bg)]">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    </div>
                  </motion.div>

                  <p className="text-[13px] leading-[18px] font-semibold text-[var(--warning)] inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span>{tText(AUTH_COPY.pendingStatus, lang)}</span>
                  </p>

                  <h2 className="text-[28px] leading-[36px] font-bold text-[var(--text)] mt-1.5">
                    {tText(AUTH_COPY.pendingTitle, lang)}
                  </h2>

                  <p className="text-[14px] leading-[22px] text-[var(--text-secondary)] mt-2 max-w-[320px]">
                    {tText(AUTH_COPY.pendingDesc, lang)}
                  </p>
                </div>

                {submittedMerchantInfo && (
                  <div className="rounded-[20px] bg-[var(--surface)] border border-[var(--border)] px-4 py-1 divide-y divide-[var(--border-subtle)]">
                    <div className="py-3.5 flex items-center justify-between gap-3 text-[14px] leading-[20px]">
                      <span className="text-[var(--text-secondary)]">
                        {tText(AUTH_COPY.refNumberLabel, lang)}
                      </span>
                      <span dir="ltr" className="font-semibold tabular-nums text-[var(--text)]">
                        #{submittedMerchantInfo.refCode}
                      </span>
                    </div>

                    <div className="py-3.5 flex items-center justify-between gap-3 text-[14px] leading-[20px]">
                      <span className="text-[var(--text-secondary)]">
                        {tText(AUTH_COPY.statusLabel, lang)}
                      </span>
                      <span className="font-semibold text-[var(--warning)] inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{tText(AUTH_COPY.underReviewValue, lang)}</span>
                      </span>
                    </div>

                    <div className="py-3.5 flex items-center justify-between gap-3 text-[14px] leading-[20px]">
                      <span className="text-[var(--text-secondary)]">
                        {tText(AUTH_COPY.storeNameLabel, lang)}
                      </span>
                      <span className="font-semibold text-[var(--text)] truncate max-w-[190px]">
                        {submittedMerchantInfo.storeName}
                      </span>
                    </div>

                    <div className="py-3.5 flex items-start justify-between gap-3 text-[14px] leading-[20px]">
                      <span className="text-[var(--text-secondary)] shrink-0">
                        {tText(AUTH_COPY.locationLabel, lang)}
                      </span>
                      <div className="text-end min-w-0">
                        <p className="font-semibold text-[var(--text)]">
                          {formatCity(submittedMerchantInfo.city, lang)} ·{' '}
                          {tText(submittedMerchantInfo.mapLabel, lang)}
                        </p>
                        <p className="text-[13px] leading-[18px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                          {submittedMerchantInfo.address}
                        </p>
                        <p className="text-[13px] leading-[18px] tabular-nums text-[var(--brand)] mt-0.5">
                          {formatCoordinates(
                            submittedMerchantInfo.lat,
                            submittedMerchantInfo.lng,
                            lang
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="py-3.5 flex items-center justify-between gap-3 text-[14px] leading-[20px]">
                      <span className="text-[var(--text-secondary)] shrink-0">
                        {tText(AUTH_COPY.certificateLabel, lang)}
                      </span>
                      <span className="font-medium text-[var(--brand)] truncate max-w-[180px] inline-flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{submittedMerchantInfo.certificateName}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 bg-[var(--bg)] border-t border-[var(--border-subtle)] px-4 sm:px-5 pt-3 auth-safe-bottom space-y-2.5">
                <AuthPrimaryButton onClick={() => setPortal('merchant')}>
                  <Store className="w-5 h-5" aria-hidden="true" />
                  <span>{tText(AUTH_COPY.trackInMerchantPortal, lang)}</span>
                </AuthPrimaryButton>
                <button
                  type="button"
                  onClick={onEnterAppAsGuest}
                  className="auth-focus-ring w-full min-h-[44px] text-[14px] leading-[20px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
                >
                  {tText(AUTH_COPY.browseAsGuest, lang)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * INTERACTIVE IN-FRAME MAP PICKER SHEET FOR STORE LOCATION
       * =================================================================== */}
      <AnimatePresence>
        {mapPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end"
            role="dialog"
            aria-modal="true"
            aria-label={tText(AUTH_COPY.mapDialogTitle, lang)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-[20px] flex flex-col max-h-[88%] overflow-hidden shadow-2xl"
            >
              {/* Drag Handle & Sheet Header */}
              <div className="pt-3 pb-3 px-4 border-b border-[var(--border-subtle)]">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
                <div className="flex items-center justify-between gap-2">
                  <div className="text-start min-w-0">
                    <h3 className="text-[16px] leading-[24px] font-semibold text-[var(--text)] truncate">
                      {tText(AUTH_COPY.mapDialogTitle, lang)} — {formatCity(regCity, lang)}
                    </h3>
                    <p className="text-[13px] leading-[18px] text-[var(--text-secondary)] mt-0.5">
                      {tText(AUTH_COPY.mapDialogHint, lang)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapPickerOpen(false)}
                    aria-label={tText(AUTH_COPY.mapDialogClose, lang)}
                    className="auth-focus-ring min-w-[44px] min-h-[44px] rounded-[12px] bg-[var(--field)] hover:bg-[var(--field-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Interactive Dark Cartographic Canvas */}
              <div className="p-4 space-y-4 overflow-y-auto thin-scroll auth-safe-bottom">
                <div
                  onClick={handleMapCanvasClick}
                  role="application"
                  aria-label={tText(AUTH_COPY.mapInteractiveAria, lang)}
                  className="relative h-56 w-full rounded-[14px] overflow-hidden border border-[var(--border)] bg-[#0E1A17] cursor-crosshair select-none"
                >
                  <svg
                    viewBox="0 0 360 220"
                    fill="none"
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full"
                  >
                    <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                      <line x1="0" y1="44" x2="360" y2="44" />
                      <line x1="0" y1="88" x2="360" y2="88" />
                      <line x1="0" y1="132" x2="360" y2="132" />
                      <line x1="0" y1="176" x2="360" y2="176" />
                      <line x1="60" y1="0" x2="60" y2="220" />
                      <line x1="120" y1="0" x2="120" y2="220" />
                      <line x1="180" y1="0" x2="180" y2="220" />
                      <line x1="240" y1="0" x2="240" y2="220" />
                      <line x1="300" y1="0" x2="300" y2="220" />
                    </g>

                    <path
                      d={
                        regCity === 'port_sudan'
                          ? 'M295 0 C282 55 318 115 288 220 L360 220 L360 0 Z'
                          : 'M0 28 C115 48 215 12 360 44 L360 0 L0 0 Z'
                      }
                      fill="rgba(45, 212, 160, 0.14)"
                    />

                    <path
                      d="M15 190 Q130 130 225 102 T345 58"
                      stroke="rgba(45, 212, 160, 0.35)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M80 12 Q145 105 178 212"
                      stroke="rgba(255, 255, 255, 0.18)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M20 96 Q175 78 338 148"
                      stroke="rgba(255, 255, 255, 0.14)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                  <span className="pointer-events-none absolute top-2.5 end-3 text-[12px] font-medium text-[var(--brand)]/80">
                    {tText(CITY_MAP_DATA[regCity].waterLabel, lang)}
                  </span>

                  {/* Geographic landmark buttons (geometric x/y map coordinates) */}
                  {CITY_MAP_DATA[regCity].landmarks.map((lm) => {
                    const isSelected =
                      Math.abs(draftPin.xPct - lm.xPct) < 4 &&
                      Math.abs(draftPin.yPct - lm.yPct) < 4;
                    return (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftPin({
                            lat: lm.lat,
                            lng: lm.lng,
                            labelAr: lm.ar,
                            labelEn: lm.en,
                            xPct: lm.xPct,
                            yPct: lm.yPct,
                          });
                        }}
                        style={{ left: `${lm.xPct}%`, top: `${lm.yPct}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 min-h-[36px] px-1 flex items-center"
                      >
                        <span
                          className={`block px-2.5 py-1 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-colors ${
                            isSelected
                              ? 'bg-[var(--brand)] text-[var(--on-brand)] font-semibold'
                              : 'bg-[var(--bg)]/90 text-[var(--text)] border border-[var(--border)] hover:border-[var(--brand)]'
                          }`}
                        >
                          {lang === 'ar' ? lm.ar : lm.en}
                        </span>
                      </button>
                    );
                  })}

                  {/* Active Dropped Pin */}
                  <motion.div
                    animate={{ left: `${draftPin.xPct}%`, top: `${draftPin.yPct}%` }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center shadow-lg ring-4 ring-[var(--brand)]/25">
                      <MapPin className="w-5 h-5 stroke-[2.4]" aria-hidden="true" />
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[var(--brand)] mt-1" />
                  </motion.div>
                </div>

                {/* Quick District Shortcuts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 thin-scroll">
                  {CITY_MAP_DATA[regCity].landmarks.map((lm) => {
                    const active = draftPin.labelEn === lm.en;
                    return (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={() =>
                          setDraftPin({
                            lat: lm.lat,
                            lng: lm.lng,
                            labelAr: lm.ar,
                            labelEn: lm.en,
                            xPct: lm.xPct,
                            yPct: lm.yPct,
                          })
                        }
                        className={`auth-focus-ring min-h-[44px] px-3.5 rounded-[12px] text-[13px] leading-[18px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'bg-[var(--brand)] text-[var(--on-brand)]'
                            : 'bg-[var(--field)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--field-hover)]'
                        }`}
                      >
                        {lang === 'ar' ? lm.ar : lm.en}
                      </button>
                    );
                  })}
                </div>

                {/* Live Localized Coordinates Readout */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0 text-start">
                    <p className="text-[15px] leading-[22px] font-semibold text-[var(--text)] truncate">
                      {lang === 'ar' ? draftPin.labelAr : draftPin.labelEn}
                    </p>
                    <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                      {formatCity(regCity, lang)}
                    </p>
                  </div>
                  <span className="text-[13px] leading-[18px] font-medium tabular-nums text-[var(--brand)] shrink-0">
                    {formatCoordinates(draftPin.lat, draftPin.lng, lang)}
                  </span>
                </div>

                {/* Confirm Location CTA */}
                <AuthPrimaryButton onClick={handleConfirmMapPin}>
                  <Check className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                  <span>{tText(AUTH_COPY.confirmMapLocation, lang)}</span>
                </AuthPrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
