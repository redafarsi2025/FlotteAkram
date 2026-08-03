import React, { Suspense, lazy, useState, useMemo } from 'react';
import { useLocalization } from '../../context/LocalizationContext';
import { useFleet } from '../../context/FleetContext';
import { supabase } from '../../lib/supabase';
import { AuthModal } from '../common/AuthModal';
import { LanguageSelector } from '../localization/LanguageSelector';

// Import our modular sub-sections
import { LogosSection } from '../landing/LogosSection';
import { ProblemsSection } from '../landing/ProblemsSection';
import { FeaturesSection } from '../landing/FeaturesSection';
import { IndustriesSection } from '../landing/IndustriesSection';
import { DemoSection } from '../landing/DemoSection';
import { ComparisonSection } from '../landing/ComparisonSection';
import { PricingSection } from '../landing/PricingSection';
import { FaqSection } from '../landing/FaqSection';
import { ContactModal } from '../landing/ContactModal';

const RoiCalculator = lazy(() => import('../landing/RoiCalculator').then(m => ({ default: m.RoiCalculator })));

import {
  TrendingUp,
  Activity,
  Package,
  Wrench,
  AlertTriangle,
  Calculator,
  FileText,
  Truck,
  Building2,
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Sun,
  MapPin,
  Wifi,
  Scale,
  Sparkles,
  Layers,
  Fuel,
  Info,
  LogIn,
  LogOut,
  UserPlus,
  Menu,
  X,
  MessageSquare,
  Users,
  Award,
  Send,
  Check,
  Calendar,
} from 'lucide-react';

import landingBg from '../../assets/images/landing_page_bg_1785625768294.jpg';

// Scenario interface for dynamic KPI preview
interface Scenario {
  id: string;
  name: { fr: string; ar: string; en: string };
  region: { fr: string; ar: string; en: string };
  operationalEfficiency: number;
  monthlyExpenditure: number; // in DZD
  criticalBreakdowns: number;
  unreconciledIncidents: number;
  description: { fr: string; ar: string; en: string };
}

export const LandingPage: React.FC = () => {
  const { currentLanguage, setLanguage, dir } = useLocalization();
  const { currentRole, changeScreen, setIsRoleSelectorOpen, currentUser } = useFleet();

  // Active scenario for dynamic KPI visualization
  const [activeScenarioId, setActiveScenarioId] = useState<string>('sahara');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalIsSignUp, setAuthModalIsSignUp] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Conversion Modals & Interactions
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [whatsAppText, setWhatsAppText] = useState<string>('');
  
  // Local simulated WhatsApp conversations
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'agent', text: string, time: string }>>([
    { 
      sender: 'agent', 
      text: currentLanguage === 'ar' 
        ? 'مرحباً! أنا أمين، المساعد اللوجستي لـ NextTransit. كيف يمكنني مساعدتك في تنظيم أسطولك اليوم؟' 
        : 'Bonjour ! Je suis Amine, votre conseiller NextTransit. Comment puis-je vous aider à optimiser votre flotte aujourd\'hui ?', 
      time: '16:40' 
    }
  ]);



  // Scenarios data
  const SCENARIOS: Scenario[] = [
    {
      id: 'sahara',
      name: {
        fr: 'Opérations Grand Sud Sahara (Hassi Messaoud / In Salah / Tamanrasset)',
        ar: 'عمليات الجنوب الكبير (حاسي مسعود / عين صالح / تمنراست)',
        en: 'Sahara Deep South Logistics (Hassi Messaoud / In Salah / Tamanrasset)',
      },
      region: { 
        fr: 'Climat extrême & Routes désertiques (Températures > 50°C & Tempêtes de sable)', 
        ar: 'مناخ قاسي وطرق صحراوية (درجات حرارة > 50 درجة وعواصف رملية)', 
        en: 'Extreme heat & desert corridors (Temperatures > 50°C & Sandstorms)' 
      },
      operationalEfficiency: 95.8,
      monthlyExpenditure: 1850000,
      criticalBreakdowns: 1,
      unreconciledIncidents: 0,
      description: {
        fr: 'Planification prédictive de la filtration d\'air et des vidanges d\'huile basée sur les algorithmes R1 et R7 adaptés aux poussières de silice sahariennes.',
        ar: 'تخطيط تنبؤي لتصفية الهواء وتغيير الزيت بناءً على خوارزميات R1 و R7 المتكيفة مع غبار السيليكا الصحراوي.',
        en: 'Predictive air filtration and lubrication intervals scheduled by R1 & R7 decision engines tailored for Saharan sandstorms.',
      },
    },
    {
      id: 'atlas',
      name: {
        fr: 'Traversée de l\'Atlas & Cols de Montagne (Chréa / Constantine / Djurdjura)',
        ar: 'عبور سلسلة جبال الأطلس (الشريعة / قسنطينة / جرجرة)',
        en: 'Atlas Mountain Ridge Operations (Chrea / Constantine / Djurdjura Passes)',
      },
      region: { 
        fr: 'Grades sévères, Pentes abruptes & Risques de verglas hivernaux', 
        ar: 'منحدرات وعرة، طرق ملتوية ومخاطر الجليد الشتوي', 
        en: 'Severe grades, sharp descents & extreme winter freeze risks' 
      },
      operationalEfficiency: 91.2,
      monthlyExpenditure: 2450000,
      criticalBreakdowns: 2,
      unreconciledIncidents: 1,
      description: {
        fr: 'Ajustement proactif de la pression pneumatique et de l\'usure des freins. Alerte R2 de conflit d\'exploitation bloquant les véhicules fatigués sur des cols glissants.',
        ar: 'ضبط استباقي لضغط واهتراء الفرامل. تنبيه التعارض R2 لمنع انطلاق المركبات المجهدة في المنحدرات الجبلية الزلقة.',
        en: 'Proactive pneumatic tire pressure monitoring and brake thermal wear metrics. R2 operation conflict guards block overworked vehicles on icy slopes.',
      },
    },
    {
      id: 'algiers',
      name: {
        fr: 'Transit Urbain Dense d\'Alger (Alger Centre / Port de Béjaïa / Oran)',
        ar: 'العبور الحضري الكثيف (وسط الجزائر / ميناء بجاية / وهران)',
        en: 'High-Density Algiers Urban Freight (Algiers Centre / Port of Bejaia / Oran)',
      },
      region: { 
        fr: 'Embouteillages sévères, Livraison portuaire & Ralentissement prolongé', 
        ar: 'ازدحام مروري شديد، تسليم الموانئ وتوقف متكرر للمحركات', 
        en: 'Severe urban bottlenecks, heavy port freight & extended idle times' 
      },
      operationalEfficiency: 93.4,
      monthlyExpenditure: 1620000,
      criticalBreakdowns: 0,
      unreconciledIncidents: 3,
      description: {
        fr: 'Suivi de la consommation de carburant au ralenti et déclenchement automatique d\'enquêtes R6 pour identifier les chocs mécaniques non télématiques.',
        ar: 'مراقبة دقيقة لاستهلاك الوقود أثناء التوقف، وتفعيل تحقيق R6 التلقائي للكشف عن الصدمات الخفيفة غير الإلكترونية.',
        en: 'Extended idling fuel audit and R6 manual checking triggers designed for stop-and-go minor impacts or transmission issues without active OBD-II codes.',
      },
    },
  ];

  const activeScenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];
  }, [activeScenarioId]);



  // Multilingual dictionary object to support translation
  const dictionary: Record<string, Record<'fr' | 'ar' | 'en', string>> = {
    title: {
      fr: 'Chaque dinar de maintenance, enfin expliqué.',
      ar: 'كل دينار صيانة، تم شرحه أخيراً.',
      en: 'Every single dinar of maintenance, finally explained.',
    },
    subtitle: {
      fr: 'NextTransit relie la télémétrie de vos véhicules, votre atelier, votre stock de pièces et votre budget en une seule décision : quel véhicule réparer, quand, et à quel coût. En français, en arabe et en anglais.',
      ar: 'يربط نيكس ترانزيت بين بيانات التتبع اللاسلكية لمركباتكم، وورشة العمل، ومخزون قطع الغيار، وميزانيتكم في قرار واحد: أي مركبة يجب إصلاحها، ومتى، وبأي تكلفة. باللغات العربية والفرنسية والإنجليزية.',
      en: 'NextTransit connects your vehicles\' telemetry, your workshop, your parts inventory, and your budget into a single decision: which vehicle to repair, when, and at what cost. Available in French, Arabic, and English.',
    },
    verifiedDataModel: {
      fr: 'Modèle de données vérifié : chaque KPI est traçable jusqu\'à la pièce.',
      ar: 'نموذج بيانات معتمد: كل مؤشر أداء رئيسي قابل للتتبع حتى قطعة الغيار.',
      en: 'Verified data model: each KPI is traceable down to the individual part.',
    },
    exploreApp: {
      fr: 'Lancer la Démo & Accéder à l\'Application',
      ar: 'بدء العرض التوضيحي ودخول التطبيق',
      en: 'Launch Demo & Access Application',
    },
    scenariosTitle: {
      fr: 'Simulation Télématique de Scénarios Nationaux',
      ar: 'محاكاة البيانات اللاسلكية للمسارات الوطنية',
      en: 'National Telemetry & Environmental Scenario Simulation',
    },
    scenariosSubtitle: {
      fr: 'Sélectionnez un profil opérationnel pour voir comment notre moteur décisionnel R1-R7 s\'ajuste dynamiquement en temps réel.',
      ar: 'اختر ملفاً تشغيلياً لتشاهد كيف تتكيف خوارزميات القرار لدينا (R1-R7) ديناميكياً في الوقت الفعلي.',
      en: 'Select an operational scenario profile to observe how our R1-R7 decision engine recalibrates live.',
    },
    rulesTitle: {
      fr: 'Les 7 Règles d\'Or de Notre Moteur de Décision (R1 - R7)',
      ar: 'القواعد السبع الذهبية لمحرك اتخاذ القرار (R1 - R7)',
      en: 'The 7 Golden Rules of Our Decision Engine (R1 - R7)',
    },
    rulesSubtitle: {
      fr: 'Des formules mathématiques strictes et immuables intégrées au coeur du code pour automatiser la sécurité, l\'inventaire et le budget.',
      ar: 'صيغ رياضية صارمة وغير قابلة للتغيير مدمجة في صلب النظام لأتمتة السلامة والمخزون والميزانية.',
      en: 'Strict, immutable mathematical formulas embedded into core modules to automate dispatch, parts allocation, and financial tracking.',
    },
    algeriaTitle: {
      fr: 'Une Solution Souveraine pour les Défis Algériens',
      ar: 'حل سيادي مصمم لرفع التحديات اللوجستية في الجزائر',
      en: 'A Sovereign Solution Built for Algerian Logistical Context',
    },
    algeriaSubtitle: {
      fr: 'Pensée pour les infrastructures locales, les réseaux de télécommunication nationaux et les conditions physiques du territoire.',
      ar: 'مصممة خصيصاً للبنية التحتية المحلية، وشبكات الاتصالات الوطنية، وظروف الطرق والطقس الوطنية.',
      en: 'Engineered specifically for local transportation infrastructure, national telecom bands, and diverse geographic climates.',
    },
    roiTitle: {
      fr: 'Calculateur de Rentabilité Réel (DZD)',
      ar: 'حاسبة العائد على الاستثمار الفعلي (بالدينار الجزائري)',
      en: 'Dynamic ROI & Savings Calculator (DZD)',
    },
    roiSubtitle: {
      fr: 'Estimez les économies immédiates générées par l\'intégration de NextTransit pour votre entreprise.',
      ar: 'قدّر الوفورات المالية الفورية التي ستحققها شركتك عند دمج نظام نيكس ترانزيت.',
      en: 'Estimate the immediate financial savings generated for your logistics firm using our engine.',
    },
    fleetSizeLabel: {
      fr: 'Nombre de véhicules dans le parc',
      ar: 'عدد المركبات في الأسطول',
      en: 'Active fleet size (number of trucks/vans)',
    },
    repairCostLabel: {
      fr: 'Coût moyen de maintenance / véhicule (DZD / mois)',
      ar: 'متوسط تكلفة الصيانة لكل مركبة (دج / شهر)',
      en: 'Average repair cost / vehicle (DZD / month)',
    },
    calcAnnualSavings: {
      fr: 'Économies Annuelles Estimées',
      ar: 'الوفورات السنوية المتوقعة',
      en: 'Estimated Annual Net Savings',
    },
    calcMonthlyCurrent: {
      fr: 'Dépenses actuelles mensuelles',
      ar: 'المصروفات الشهرية الحالية',
      en: 'Current Monthly Expenditure',
    },
    calcBreakdownsPrevented: {
      fr: 'Pannes critiques évitées par an',
      ar: 'أعطال حرجة تم تفاديها سنوياً',
      en: 'Critical Breakdowns Avoided / Year',
    },
    calcTitle: {
      fr: 'Résultats de la simulation d\'impact',
      ar: 'نتائج محاكاة الأثر المالي',
      en: 'Financial Impact Simulation Results',
    },
  };

  const currentT = (key: string): string => {
    const lang = (currentLanguage === 'fr' || currentLanguage === 'ar' || currentLanguage === 'en') ? currentLanguage : 'fr';
    return dictionary[key]?.[lang] || dictionary[key]?.fr || key;
  };

  // Simulated WhatsApp submission
  const handleWhatsAppSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppText.trim()) return;

    const userMsg = whatsAppText;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: userMsg, time: timeStr }];
    setChatHistory(updatedHistory);
    setWhatsAppText('');

    // Generate responsive simulated reply
    setTimeout(() => {
      let reply = '';
      const textLower = userMsg.toLowerCase();
      if (textLower.includes('prix') || textLower.includes('tarif') || textLower.includes('سعر') || textLower.includes('تكلفة')) {
        reply = currentLanguage === 'ar'
          ? 'تبدأ أسعارنا من 28,000 دج شهرياً للأسطول الصغير. يمكننا تحضير كشف مالي مفصل لشركتك، هل ترغب بحجز مكالمة؟'
          : 'Nos tarifs débutent à partir de 28 000 DA/mois pour les petites flottes. Souhaitez-vous planifier une démo ou recevoir un devis personnalisé par email ?';
      } else if (textLower.includes('heberg') || textLower.includes('donnee') || textLower.includes('سيرفر') || textLower.includes('بيانات')) {
        reply = currentLanguage === 'ar'
          ? 'نحن ندعم الاستضافة السحابية الآمنة وكذلك خيار تثبيت السيرفرات محلياً داخل الجزائر للشركات الوطنية الكبرى.'
          : 'Nous proposons l\'hébergement en Algérie (On-Premise) pour garantir la souveraineté totale de vos données d\'exploitation.';
      } else {
        reply = currentLanguage === 'ar'
          ? 'شكراً لتواصلك! لقد تلقينا استفسارك وسيقوم أحد مهندسي النقل لدينا بالاتصال بك قريباً جداً لتوضيح التفاصيل.'
          : 'Merci pour votre message ! Un conseiller NextTransit spécialisé dans votre secteur va vous recontacte très rapidement par téléphone.';
      }
      setChatHistory(prev => [...prev, { sender: 'agent' as const, text: reply, time: timeStr }]);
    }, 1200);
  };

  return (
    <div className="space-y-16 pb-12">

      {/* LANDING PAGE HORIZONTAL HEADER MENU */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl px-4 py-3 shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-950 tracking-tight">NextTransit</span>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded ml-1.5 font-mono">DZ</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu Navigation Links */}
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 w-full lg:w-auto`}>
          <nav className="flex flex-col lg:flex-row gap-2 lg:gap-5 font-semibold text-xs text-slate-600">
            <button
              onClick={() => {
                document.getElementById('scenarios-simulation')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-indigo-600 hover:underline transition font-bold"
            >
              {currentLanguage === 'ar' ? 'المحاكاة الإقليمية' : currentLanguage === 'en' ? 'Zone Simulator' : 'Simulateur'}
            </button>
            <button
              onClick={() => {
                document.getElementById('problems-solve')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-indigo-600 hover:underline transition font-bold"
            >
              {currentLanguage === 'ar' ? 'المشكلات' : currentLanguage === 'en' ? 'Problems' : 'Problèmes'}
            </button>
            <button
              onClick={() => {
                document.getElementById('features-list')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-indigo-600 hover:underline transition font-bold"
            >
              {currentLanguage === 'ar' ? 'الوحدات والمميزات' : currentLanguage === 'en' ? 'ERP Modules' : 'Modules ERP'}
            </button>
            <button
              onClick={() => {
                document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="text-left py-1 hover:text-indigo-600 hover:underline transition font-bold"
            >
              {currentLanguage === 'ar' ? 'الأسعار' : currentLanguage === 'en' ? 'Pricing' : 'Tarifs'}
            </button>
          </nav>

          <div className="flex flex-col sm:flex-row lg:items-center gap-3 pt-2 lg:pt-0 border-t border-slate-100 lg:border-0">
            {/* Language Selector */}
            <LanguageSelector />

            {/* User Session Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 max-w-[120px] truncate" title={currentUser.email}>
                  {currentUser.email}
                </span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-600" />
                  <span>{currentLanguage === 'ar' ? 'خروج' : currentLanguage === 'en' ? 'Log Out' : 'Déconnexion'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalIsSignUp(false);
                    setShowAuthModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{currentLanguage === 'ar' ? 'دخول' : currentLanguage === 'en' ? 'Log In' : 'Connexion'}</span>
                </button>

                <button
                  onClick={() => {
                    setAuthModalIsSignUp(true);
                    setShowAuthModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{currentLanguage === 'ar' ? 'إنشاء حساب' : currentLanguage === 'en' ? 'Sign Up' : 'S\'enregistrer'}</span>
                </button>
              </div>
            )}

            {/* App Launch CTA */}
            <button
              onClick={() => {
                changeScreen('STRATEGIC_DASHBOARD');
                setIsMobileMenuOpen(false);
              }}
              className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:bg-indigo-500"
            >
              <span>{currentLanguage === 'ar' ? 'دخول التطبيق' : currentLanguage === 'en' ? 'Launch Operations' : 'Accéder à l\'App'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION WITH BACKGROUND IMAGE AND CTAs */}
      <div className="relative rounded-3xl border border-slate-200 bg-slate-950 text-white overflow-hidden shadow-xl min-h-[520px] lg:min-h-[580px] flex items-center">
        
        {/* Widescreen Background Image with Soft Left or RTL Right Fade */}
        <div className="absolute inset-0 z-0">
          <img
            src={landingBg}
            alt="NextTransit Algerian Fleet Operations sunset background visual"
            className="w-full h-full object-cover object-center opacity-40 lg:opacity-50"
            referrerPolicy="no-referrer"
          />
          {/* Dynamic multi-directional gradient overlay to guarantee text readability in any language alignment */}
          <div className={`absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent lg:bg-gradient-to-r lg:from-slate-950 lg:via-slate-950/80 lg:to-slate-900/10 ${dir === 'rtl' ? 'lg:bg-gradient-to-l' : 'lg:bg-gradient-to-r'}`} />
        </div>

        {/* Content Box */}
        <div className="relative z-10 max-w-4xl p-6 sm:p-8 lg:p-12 space-y-6">
          <div className="flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              NextTransit Enterprise • Algérie Edition
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {currentT('verifiedDataModel')}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5.5xl font-extrabold tracking-tight leading-tight text-white">
              {currentT('title')}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed font-normal">
              {currentT('subtitle')}
            </p>
          </div>

          {/* Core Telemetry Indicators inside Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 max-w-xl">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <span className="text-[10px] uppercase text-indigo-300 font-bold block tracking-wider">
                {currentLanguage === 'ar' ? 'التوجيه اللوجستي' : currentLanguage === 'en' ? 'Territorial Routing' : 'Routage Territorial'}
              </span>
              <span className="text-sm font-extrabold text-white mt-0.5 block">
                Alger • Oran • Bejaia
              </span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <span className="text-[10px] uppercase text-indigo-300 font-bold block tracking-wider">
                {currentLanguage === 'ar' ? 'محرك القرار' : currentLanguage === 'en' ? 'Decision Engine' : 'Moteur de Décision'}
              </span>
              <span className="text-sm font-extrabold text-white mt-0.5 block">
                {currentLanguage === 'ar' ? 'صيغة CAE شفافة' : currentLanguage === 'en' ? 'Transparent CAE Formula' : 'Formule CAE Transparente'}
              </span>
            </div>
            <div className="hidden sm:block rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-xs">
              <span className="text-[10px] uppercase text-indigo-300 font-bold block tracking-wider">
                {currentLanguage === 'ar' ? 'المعيار المعتمد' : currentLanguage === 'en' ? 'National Standard' : 'Norme Nationale'}
              </span>
              <span className="text-sm font-extrabold text-white mt-0.5 block">
                DZD Compliance
              </span>
            </div>
          </div>

          {/* Action Buttons with high visibility */}
          <div className="pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
              <button
                onClick={() => changeScreen('STRATEGIC_DASHBOARD')}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 transition-all cursor-pointer group"
              >
                {currentT('exploreApp')}
                <ArrowRight className={`h-4 w-4 transform transition-transform ${dir === 'rtl' ? 'rotate-180' : 'group-hover:translate-x-1'}`} />
              </button>

              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <Calendar className="h-4 w-4 text-white" />
                {currentLanguage === 'ar' ? 'احجز موعد عرض تجريبي' : currentLanguage === 'en' ? 'Request a Live Demo' : 'Prendre Rendez-vous'}
              </button>
            </div>

            {/* Secondary Action Links */}
            <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <button
                onClick={() => {
                  setAuthModalIsSignUp(true);
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-1.5 hover:text-white underline underline-offset-4 decoration-indigo-400/50 hover:decoration-indigo-400 transition-all cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                <span>{currentLanguage === 'ar' ? 'إنشاء حساب جديد (Tenant)' : currentLanguage === 'en' ? 'Sign Up / Create Account' : 'Créer un compte / S\'enregistrer'}</span>
              </button>

              <span className="text-slate-600">•</span>

              <button
                onClick={() => setIsRoleSelectorOpen(true)}
                className="inline-flex items-center gap-1.5 hover:text-white underline underline-offset-4 decoration-indigo-400/50 hover:decoration-indigo-400 transition-all cursor-pointer"
              >
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>{currentLanguage === 'ar' ? 'تبديل الأدوار والمسؤوليات' : currentLanguage === 'en' ? 'Simulate Role Dashboard' : 'Simuler un Rôle Métier'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Small credit flag */}
        <div className={`absolute bottom-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} hidden md:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-400`}>
          <div className="h-2 w-3 bg-emerald-600 rounded-2xs relative overflow-hidden flex flex-col">
            <div className="h-full bg-white w-1/2 self-end" />
            <div className="absolute inset-0 flex items-center justify-center text-[5px] text-red-600">★</div>
          </div>
          <span>Souveraineté des données d\'exploitation de transport logistique en Algérie</span>
        </div>
      </div>

      {/* 2. TRUST SECTION */}
      <LogosSection currentLanguage={currentLanguage} />

      {/* 3. PROBLEMS WE SOLVE */}
      <div id="problems-solve">
        <ProblemsSection currentLanguage={currentLanguage} />
      </div>

      {/* 4. DYNAMIC LIVE ENVIRONMENT SCENARIO SIMULATOR (KPI HIGHLIGHTS) */}
      <div id="scenarios-simulation" className="space-y-6">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
            {currentLanguage === 'ar' ? 'تتبع فوري ومحاكاة' : currentLanguage === 'en' ? 'GEOGRAPHIC REALITY' : 'CONSEILS D\'ÉCONOMIE TERRITORIALE'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-950 flex items-center justify-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            {currentT('scenariosTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {currentT('scenariosSubtitle')}
          </p>
        </div>

        {/* Tab Scenario selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                activeScenarioId === sc.id
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                  {sc.id === 'sahara' ? 'Zone Sud' : sc.id === 'atlas' ? 'Zone Nord' : 'Zone Urbaine'}
                </span>
                {activeScenarioId === sc.id && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                )}
              </div>
              <h3 className="text-xs font-bold text-slate-950">
                {sc.name[currentLanguage as 'fr'|'ar'|'en'] || sc.name.fr}
              </h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                {sc.region[currentLanguage as 'fr'|'ar'|'en'] || sc.region.fr}
              </p>
            </button>
          ))}
        </div>

        {/* Live Scenario Telemetry & Decision KPI Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs relative">
          
          {/* Active scenario description */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="h-3.5 w-3.5" />
                NextTransit Diagnostic Mode
              </span>
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {activeScenario.name[currentLanguage as 'fr'|'ar'|'en'] || activeScenario.name.fr}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeScenario.description[currentLanguage as 'fr'|'ar'|'en'] || activeScenario.description.fr}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {currentLanguage === 'ar' ? 'شبكة التتبع المتصلة' : currentLanguage === 'en' ? 'Active Network Stream' : 'Flux Réseau Actif'}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                {activeScenarioId === 'sahara' 
                  ? 'Mobilis / Djezzy Edge Compression' 
                  : activeScenarioId === 'atlas' 
                    ? 'Multi-SIM Redundant (3G/4G Atlas)' 
                    : 'Alger Center 4G - Ultra High Frequency'}
              </div>
            </div>
          </div>

          {/* Core Decision KPIs */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'جاهزية الأسطول' : currentLanguage === 'en' ? 'Fleet Availability' : 'Disponibilité Flotte'}
              </span>
              <div className="my-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {activeScenario.operationalEfficiency}%
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {currentLanguage === 'ar' ? 'فوق حد الأمان' : currentLanguage === 'en' ? 'Above Target limit' : 'Supérieur à l\'objectif'}
              </div>
            </div>

            {/* KPI 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'الإنفاق الشهري المقدر' : currentLanguage === 'en' ? 'Simulated Monthly Expense' : 'Dépense Mensuelle Estimée'}
              </span>
              <div className="my-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {activeScenario.monthlyExpenditure.toLocaleString()} DA
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700">
                <Scale className="h-3 w-3" />
                {currentLanguage === 'ar' ? 'ضمن ميزانية الإقليم' : currentLanguage === 'en' ? 'Within territorial budget' : 'Inclus dans le budget territorial'}
              </div>
            </div>

            {/* KPI 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'الحوادث الحرجة (R1)' : currentLanguage === 'en' ? 'Critical Faults (R1)' : 'Défauts Critiques (R1)'}
              </span>
              <div className="my-2">
                <span className={`text-3xl font-black tracking-tight ${activeScenario.criticalBreakdowns > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {activeScenario.criticalBreakdowns}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                {activeScenario.criticalBreakdowns > 0 
                  ? (currentLanguage === 'ar' ? 'تحتاج تدخل طارئ' : currentLanguage === 'en' ? 'Emergency intervention' : 'Intervention urgente requise')
                  : (currentLanguage === 'ar' ? 'أمان تام' : currentLanguage === 'en' ? 'Zero hazards detected' : 'Aucun danger détecté')}
              </div>
            </div>

            {/* KPI 4 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {currentLanguage === 'ar' ? 'مطابقة التقرير (R6)' : currentLanguage === 'en' ? 'R6 Reconciliation Cases' : 'Cas de Réconciliation R6'}
              </span>
              <div className="my-2">
                <span className={`text-3xl font-black tracking-tight ${activeScenario.unreconciledIncidents > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                  {activeScenario.unreconciledIncidents}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                {activeScenario.unreconciledIncidents > 0 
                  ? (currentLanguage === 'ar' ? 'تحقيقات مفتوحة للفرامل' : currentLanguage === 'en' ? 'Open audit investigations' : 'Enquêtes mécaniques ouvertes')
                  : (currentLanguage === 'ar' ? 'متطابق كلياً' : currentLanguage === 'en' ? '100% telemetry synced' : 'Télémétrie 100% alignée')}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 5. FEATURES BREAKDOWN (14 SAAS MODULES) */}
      <div id="features-list">
        <FeaturesSection 
          currentLanguage={currentLanguage} 
          onExploreDemo={() => changeScreen('STRATEGIC_DASHBOARD')} 
        />
      </div>

      {/* 6. INDUSTRIES SECTION */}
      <IndustriesSection currentLanguage={currentLanguage} />

      {/* 7. INTERACTIVE PRODUCT WORKFLOW SIMULATOR */}
      <DemoSection currentLanguage={currentLanguage} />

      {/* 8. DETERMINISTIC DECISION ENGINE SHOWCASE (PHASE 1) */}
      <div className="rounded-3xl border border-indigo-500/80 bg-slate-950 text-white p-6 sm:p-8 lg:p-12 relative overflow-hidden shadow-xl space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

        <div className="space-y-3 text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
            <Zap className="h-3 w-3 text-indigo-400" />
            NextTransit Decision Engine • Phase 1
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {currentLanguage === 'ar' ? 'محرك قرار حتمي وشفاف وقابل للتدقيق' : currentLanguage === 'en' ? 'A Deterministic, Transparent, Auditable Decision Engine' : 'Un Moteur de Décision Déterministe, Transparent et Vérifiable'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            {currentLanguage === 'ar' 
              ? 'كل توصية تعتمد على قواعد واضحة (R1-R7) وقابلة للتدقيق بدون صندوق أسود. المرحلة 2 (الموديلات الإحصائية) والمرحلة 3 (تعلم الآلة) تأتي بعد تجميع بيانات الإنتاج.'
              : currentLanguage === 'en'
              ? 'Every recommendation is based on clear, auditable R1-R7 rules with no black box. Phase 2 (statistical models) and Phase 3 (machine learning) arrive once production data is gathered.'
              : 'Chaque recommandation est basée sur des règles claires (R1-R7), auditables et sans boîte noire. La phase 2 (modèles statistiques) et la phase 3 (machine learning) arrivent une fois les données de production collectées.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          
          {/* Feature 1 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'تقارير تنفيذية حتمية' : currentLanguage === 'en' ? 'Deterministic Executive Reports' : 'Rapports Exécutifs Déterministes'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              {currentLanguage === 'ar' ? 'ملخص دقيق للميزانيات وحساب الفروقات التشغيلية عبر محرك القواعد R4-R7.' : currentLanguage === 'en' ? 'Generates clear summaries of budget variances and operational bottlenecks calculated via R4-R7 rules engine.' : 'Génère un résumé clair des variations budgétaires et des goulots d\'étranglement calculé par le moteur de règles R4-R7.'}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Wrench className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'حساب وقائي للتآكل' : currentLanguage === 'en' ? 'Predictive Wear Calculation' : 'Calcul Prédictif d\'Usure'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              {currentLanguage === 'ar' ? 'حساب معدل تآكل الزيوت والفلاتر بناءً على قواعد تشغيلية صحراوية.' : currentLanguage === 'en' ? 'Calculates oil and filter degradation rates based on business rules for desert and climate exposure.' : 'Calcule le niveau de dégradation des lubrifiants selon des règles métier d\'exposition au sable et au climat.'}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'ترجمة وتوحيد المصطلحات الفنية' : currentLanguage === 'en' ? 'Technical Translation & Standard' : 'Traduction Technique & Normalisation'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              {currentLanguage === 'ar' ? 'ترجمة وتوحيد التقارير الفنية المكتوبة بالعامية أو الفرنسية إلى لغات النظام.' : currentLanguage === 'en' ? 'Translates and normalizes driver fault logs between dialectal Arabic and technical French into standard codes.' : 'Traduite et normalise automatiquement les notes de panne rédigées en arabe dialectal ou français technique vers le référentiel métier.'}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-white">
              {currentLanguage === 'ar' ? 'توصيات الشراء المؤتمتة' : currentLanguage === 'en' ? 'Automated Procurement Rules' : 'Recommandations d\'Achat Automatisées'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              {currentLanguage === 'ar' ? 'كشف انخفاض المباشر للمخزون واستخراج الفروقات السعرية لتفعيل أمر الشراء R3.' : currentLanguage === 'en' ? 'Detects inventory buffer breaches and price variance against benchmark rates to trigger automated R3 purchase orders.' : 'Détecte les dépassements de seuil de stock et les écarts de prix par rapport au barème de référence pour déclencher le réapprovisionnement R3.'}
            </p>
          </div>

        </div>
      </div>

      {/* 9. WHY CHOOSE US (SaaS vs LEGACY DESKTOP ERP vs MANUAL PAPER) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
              {currentLanguage === 'ar' ? 'لماذا تختار منصتنا؟' : currentLanguage === 'en' ? 'PROVEN VALUE' : 'NOTRE PROPOSITION DE VALEUR'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
              {currentLanguage === 'ar' ? 'أكثر من مجرد برنامج تتبع - نظام ذكاء مالي وتشغيلي متكامل' : currentLanguage === 'en' ? 'A Sovereign Decision Engine Built for Total Fiscal Control' : 'Un ERP qui automatise l\'audit de votre rentabilité'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {currentLanguage === 'ar' ? 'تجمع منصتنا بين المحاسبة المتوافقة مع الـ SCF، تتبع المركبات، إدارة المخزن وصيانة الورشة في مكان واحد معتمد ومطابق للقوانين الضريبية الجزائرية.' : currentLanguage === 'en' ? 'We sync workshop workflows, parts inventory, state CNAS payroll and fuel metrics into one single database conforming to Algerian legal audits.' : 'NextTransit réconcilie en direct l\'usure réelle de vos pneus ou moteurs avec l\'état des stocks de pièces détachées et les finances.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">{currentLanguage === 'ar' ? 'توافق كامل مع المخطط الوطني للمحاسبة SCF' : currentLanguage === 'en' ? 'Full Compatibility with Algerian SCF Guidelines' : 'Imputation comptable automatisée aux normes SCF'}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">{currentLanguage === 'ar' ? 'استضافة سحابية خاصة مخصصة داخل الجزائر لحفظ السيادة' : currentLanguage === 'en' ? 'Dedicated Sovereign Local Hosting Options available' : 'Souveraineté absolue et hébergement local agréé'}</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">{currentLanguage === 'ar' ? 'تطبيق صارم للقواعد الرياضية R1-R7 لتنظيم العمليات' : currentLanguage === 'en' ? 'Mathematical Enforcement of strict R1-R7 Rules' : 'Respect mathématique des règles métier R1-R7'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 9b. ADVANCED ROI CALCULATOR COMPONENT */}
      <Suspense fallback={<div className="h-40" />}>
        <RoiCalculator 
          currentLanguage={currentLanguage} 
          onExploreDemo={() => changeScreen('STRATEGIC_DASHBOARD')} 
        />
      </Suspense>

      {/* 10. COMPARISON MATRIX (EXCEL vs LEGACY ERP vs NEXTTRANSIT) */}
      <ComparisonSection currentLanguage={currentLanguage} />

      {/* 11. PILOT PROGRAM (REPLACES TESTIMONIALS) */}
      <div className="space-y-8 py-4">
        <div className="space-y-3 text-center max-w-3xl mx-auto">
          <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block">
            {currentLanguage === 'ar' ? 'البرنامج التجريبي - المرحلة 0' : currentLanguage === 'en' ? 'PHASE 0 PILOT PROGRAM' : 'PROGRAMME PILOTE PHASE 0'}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
            {currentLanguage === 'ar' ? 'انضم إلى برنامجنا التجريبي' : currentLanguage === 'en' ? 'Join Our Pilot Program' : 'Rejoignez notre programme pilote'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            {currentLanguage === 'ar' 
              ? 'نيكست ترانزيت في مرحلة الإطلاق. أول 3 أساطيل تنضم إلى البرنامج التجريبي تستفيد من تجربة مجانية لمدة 30 يومًا على بياناتها الخاصة، مع هدف تعاقدي لتقليل تكاليف التوقف بنسبة 15%.'
              : currentLanguage === 'en'
              ? 'NextTransit is in launch phase. The first 3 fleets joining the pilot program get a free 30-day POC on their own data, with a contractual target of -15% downtime costs.'
              : 'NextTransit est en phase de lancement. Les 3 premières flottes qui rejoignent le programme pilote bénéficient d\'un POC gratuit de 30 jours sur leurs propres données, avec un objectif contractualisé de -15% de coûts d\'immobilisation.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-indigo-200 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                {currentLanguage === 'ar' ? '1. تدقيق سريع' : currentLanguage === 'en' ? '1. Overnight Audit' : '1. Audit Overnight'}
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">
                {currentLanguage === 'ar' ? 'أرسل ملف إكسل الخاص بك الليلة' : currentLanguage === 'en' ? 'Send your Excel export tonight' : 'Envoyez votre export Excel ce soir'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentLanguage === 'ar' ? 'تحليل ليلي، وتقرير تفصيلي خلال 24 ساعة.' : currentLanguage === 'en' ? 'Overnight analysis, full report within 24h.' : 'Analyse overnight, rapport sous 24h.'}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-indigo-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{currentLanguage === 'ar' ? 'رأي فوري' : currentLanguage === 'en' ? 'Instant insights' : 'Diagnostic rapide'}</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-indigo-200 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                {currentLanguage === 'ar' ? '2. عرض مخصص' : currentLanguage === 'en' ? '2. Custom Demo' : '2. Démo Sur-Mesure'}
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">
                {currentLanguage === 'ar' ? 'عرض توضيحي على بياناتك الخاصة' : currentLanguage === 'en' ? 'Demo on your own data' : 'Démo sur vos propres données'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentLanguage === 'ar' ? 'بدون بيانات وهمية، أسطولك الحقيقي ومساراتك.' : currentLanguage === 'en' ? 'No dummy data, your actual fleet and routes.' : 'Pas de données fictives, votre flotte réelle.'}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-indigo-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{currentLanguage === 'ar' ? 'بيانات حقيقية' : currentLanguage === 'en' ? 'Real data' : 'Souveraineté des données'}</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xs hover:border-indigo-200 transition-all">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                {currentLanguage === 'ar' ? '3. تجربة معتمدة' : currentLanguage === 'en' ? '3. Contracted POC' : '3. POC Contractualisé'}
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">
                {currentLanguage === 'ar' ? 'تجربة مجانية لمدة 30 يومًا' : currentLanguage === 'en' ? 'Free 30-day POC' : 'POC 30 jours gratuit'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentLanguage === 'ar' ? '10 مركبات، هدف خفض تكاليف التوقف بنسبة 15%.' : currentLanguage === 'en' ? '10 vehicles, target -15% downtime costs.' : '10 véhicules, objectif -15% coûts d\'immobilisation.'}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{currentLanguage === 'ar' ? 'مردود مضمون' : currentLanguage === 'en' ? 'Target guaranteed' : 'Objectif mesurable'}</span>
            </div>
          </div>

        </div>

        {/* CTA Button */}
        <div className="text-center pt-2">
          <button
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <Calendar className="h-4.5 w-4.5 text-white" />
            <span>
              {currentLanguage === 'ar' ? 'انضم إلى البرنامج التجريبي (POC مجاني)' : currentLanguage === 'en' ? 'Join the Pilot Program (Free POC)' : 'Rejoindre le Programme Pilote (POC Gratuit)'}
            </span>
            <ArrowRight className={`h-4 w-4 transform ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 12. PRICING PLANS */}
      <div id="pricing-plans">
        <PricingSection 
          currentLanguage={currentLanguage}
          onExploreDemo={() => changeScreen('STRATEGIC_DASHBOARD')}
          onRequestDemo={() => setShowContactModal(true)}
        />
      </div>

      {/* 13. FAQ ACCORDION SECTION (ADDRESS OBJECTIONS) */}
      <FaqSection currentLanguage={currentLanguage} />

      {/* 14. FINAL CALL TO ACTION BOX */}
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-950 to-slate-950 text-white p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
            {currentLanguage === 'ar' ? 'ابدأ في التحكم في كل دينار من ميزانية صيانة أسطولك اليوم' : currentLanguage === 'en' ? 'Take Absolute Fiscal Control Over Every Single Maintenance Dinar' : 'Prenez le contrôle de chaque dinar de maintenance dès aujourd\'hui'}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl mx-auto">
            {currentLanguage === 'ar' ? 'انضم إلى المؤسسات الجزائرية الرائدة التي تستخدم نيكس ترانزيت لتفادي الأعطال، خفض نفقات قطع الغيار، ومطابقة المحاسبة SCF.' : currentLanguage === 'en' ? 'Deploy predictive R1-R7 rules and optimize stock reservation to boost your bottom line.' : 'Instaurez les règles d\'or de maintenance R1-R7 et automatisez le suivi de vos ateliers.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center justify-center pt-2">
          <button
            onClick={() => changeScreen('STRATEGIC_DASHBOARD')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
          >
            <span>{currentLanguage === 'ar' ? 'دخول التطبيق التوضيحي' : currentLanguage === 'en' ? 'Launch demo workspace' : 'Lancer la démonstration'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setShowContactModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>{currentLanguage === 'ar' ? 'احجز مكالمة فنية مجانية' : currentLanguage === 'en' ? 'Schedule Private Consultation' : 'Prendre rendez-vous expert'}</span>
          </button>
        </div>

        <div className="relative z-10 pt-4 flex items-center justify-center gap-6 text-[10px] text-indigo-300 font-medium">
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            {currentLanguage === 'ar' ? 'لا تتطلب بطاقة ائتمان' : 'Sans carte de crédit'}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            {currentLanguage === 'ar' ? 'مطابق لـ SCF بنسبة 100%' : '100% Conforme SCF'}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            {currentLanguage === 'ar' ? 'تجربة مجانية لمدة 14 يوماً' : '14 jours d\'essai gratuit'}
          </span>
        </div>
      </div>

      {/* 15. COMPREHENSIVE ENTERPRISE FOOTER */}
      <footer className="border-t border-slate-200 pt-12 pb-6 space-y-10 text-xs text-slate-500">
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          
          {/* Logo, pitch & address */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Truck className="h-4.5 w-4.5" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">NextTransit ERP</span>
              <span className="text-[8px] bg-emerald-50 text-emerald-700 font-bold px-1 rounded font-mono">DZ</span>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
              {currentLanguage === 'ar'
                ? 'منصة تخطيط موارد المؤسسات المتكاملة لحساب ميزانية صيانة أساطيل النقل، الورشات الميكانيكية، وحجز قطع غيار السيارات والشاحنات بالجزائر.'
                : 'La plateforme de décision et ERP de référence en Algérie pour la réconciliation télématique de flotte, la gestion d\'atelier, les stocks R3 et la comptabilité analytique SCF.'}
            </p>

            <div className="space-y-1 text-[11px]">
              <span className="font-bold text-slate-800 block">NextTransit Algérie S.A.R.L.</span>
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                12, Rue Didouche Mourad, Alger Centre, Algérie
              </span>
              <span className="block text-slate-500">Tél : +213 (0) 21 50 51 52 | E-mail : contact@nexttransit.dz</span>
            </div>
          </div>

          {/* Module Links */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">{currentLanguage === 'ar' ? 'الوحدات البرمجية' : 'Modules ERP'}</h5>
            <ul className="space-y-1.5 font-medium text-[11px]">
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Comptabilité SCF</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Gestion d\'Atelier & R1</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Stocks de Pièces R3</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Paie & DAS CNAS</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">BTP & Chantiers</button></li>
            </ul>
          </div>

          {/* Industry Links */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">{currentLanguage === 'ar' ? 'الحلول القطاعية' : 'Secteurs d\'Activité'}</h5>
            <ul className="space-y-1.5 font-medium text-[11px]">
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Bâtiment & Travaux Publics (BTP)</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Transport de Fret & Logistique</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Industries & Manufacturier</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Distribution de Grossistes</button></li>
              <li><button onClick={() => changeScreen('STRATEGIC_DASHBOARD')} className="hover:text-indigo-600 transition text-left">Santé & Services</button></li>
            </ul>
          </div>

          {/* Legal / Sovereign validations */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">{currentLanguage === 'ar' ? 'السيادة والامتثال المالي' : 'Gouvernance & Paiement'}</h5>
            <div className="space-y-2 text-[10px]">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 font-semibold leading-normal">
                {currentLanguage === 'ar' ? 'معتمد من وزارة المالية والمصالح الضريبية الجزائرية لإنتاج اللياقة الضريبية.' : 'Agréé par la Direction Générale des Impôts (DGI) pour les bilans fiscaux.'}
              </div>
              <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-800 font-semibold leading-normal">
                {currentLanguage === 'ar' ? 'دفع آمن بالدينار الجزائري عبر التحويل المصرفي أو شيك بريدي (CCP).' : 'Facturation nationale en DZD, paiements acceptés par virement ou CCP.'}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className="pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400">
          <span>NextTransit Premium Decision ERP Platform S.A.R.L. © 2026. {currentLanguage === 'ar' ? 'كل الحقوق محفوظة.' : 'Tous droits réservés.'}</span>
          <div className="flex gap-4 font-bold text-slate-500">
            <a href="#" className="hover:text-indigo-600">{currentLanguage === 'ar' ? 'سياسة الخصوصية السيادية' : 'Confidentialité'}</a>
            <span>•</span>
            <a href="#" className="hover:text-indigo-600">{currentLanguage === 'ar' ? 'شروط الخدمة والاستخدام' : 'Conditions Générales'}</a>
            <span>•</span>
            <a href="#" className="hover:text-indigo-600">Algeria Security Center</a>
          </div>
        </div>

      </footer>

      {/* 16. THE MAGNIFICENT INTERACTIVE WHATSAPP FLOATING HELPER BUBBLE */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
        {isWhatsAppOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Chat Header */}
            <div className="bg-emerald-600 p-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center font-bold text-xs relative">
                  AM
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-emerald-600 animate-pulse" />
                </div>
                <div>
                  <span className="font-bold text-xs block leading-tight">Amine • NextTransit</span>
                  <span className="text-[9px] text-emerald-100 flex items-center gap-1">
                    <span className="h-1 w-1 bg-green-200 rounded-full" />
                    {currentLanguage === 'ar' ? 'متصل الآن للإجابة' : 'En ligne - Conseiller Logistique'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsWhatsAppOpen(false)}
                className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 p-3 bg-slate-50 space-y-2 overflow-y-auto max-h-[240px] text-xs">
              {chatHistory.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className={`p-2.5 rounded-2xl leading-normal ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleWhatsAppSend} className="p-2 border-t border-slate-100 flex gap-2 bg-white">
              <input
                type="text"
                value={whatsAppText}
                onChange={(e) => setWhatsAppText(e.target.value)}
                placeholder={currentLanguage === 'ar' ? 'اكتب سؤالك هنا...' : 'Posez votre question...'}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              />
              <button 
                type="submit"
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="flex h-12 items-center gap-2 px-4 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-500 transition-all cursor-pointer group"
          >
            <MessageSquare className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap block max-w-0 group-hover:max-w-[150px] overflow-hidden transition-all duration-300">
              {currentLanguage === 'ar' ? 'تحدث مع مستشار جزائري' : 'Discuter avec Amine'}
            </span>
          </button>
        )}
      </div>

      {/* Auth Modal Trigger */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} initialIsSignUp={authModalIsSignUp} />
      )}

      {/* Live Calendar booking Modal */}
      {showContactModal && (
        <ContactModal 
          onClose={() => setShowContactModal(false)} 
          currentLanguage={currentLanguage} 
        />
      )}

    </div>
  );
};
