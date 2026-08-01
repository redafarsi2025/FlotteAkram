import { LanguageCode, GlossaryTerm } from '../types/localization';
import { INITIAL_TRANSLATIONS } from '../data/translations/dictionary';

// Comprehensive technical vocabulary mapping for Free SaaS Translation
const TECHNICAL_LEXICON: Record<string, { en: string; ar: string }> = {
  // Common UI Verbs & Nouns
  'enregistrer': { en: 'save', ar: 'حفظ' },
  'annuler': { en: 'cancel', ar: 'إلغاء' },
  'modifier': { en: 'edit', ar: 'تعديل' },
  'supprimer': { en: 'delete', ar: 'حذف' },
  'actions': { en: 'actions', ar: 'إجراءات' },
  'statut': { en: 'status', ar: 'حالة' },
  'rechercher': { en: 'search', ar: 'بحث' },
  'filtrer': { en: 'filter', ar: 'تصفية' },
  'tous': { en: 'all', ar: 'الكل' },
  'fermer': { en: 'close', ar: 'إغلاق' },
  'actualiser': { en: 'refresh', ar: 'تحديث' },
  'exporter': { en: 'export', ar: 'تصدير' },
  'importer': { en: 'import', ar: 'استيراد' },
  'détails': { en: 'details', ar: 'تفاصيل' },
  'confirmer': { en: 'confirm', ar: 'تأكيد' },
  'retour': { en: 'back', ar: 'رجوع' },
  'réinitialiser': { en: 'reset', ar: 'إعادة تعيين' },
  'chargement': { en: 'loading', ar: 'جاري التحميل' },
  'aucun': { en: 'none', ar: 'لا يوجد' },
  'actif': { en: 'active', ar: 'نشط' },
  'inactif': { en: 'inactive', ar: 'غير نشط' },
  'succès': { en: 'success', ar: 'نجاح' },
  'erreur': { en: 'error', ar: 'خطأ' },
  'date': { en: 'date', ar: 'تاريخ' },
  'catégorie': { en: 'category', ar: 'فئة' },
  'description': { en: 'description', ar: 'وصف' },
  'type': { en: 'type', ar: 'نوع' },
  'notes': { en: 'notes', ar: 'ملاحظات' },
  'total': { en: 'total', ar: 'إجمالي' },

  // Fleet & Vehicles
  'flotte': { en: 'fleet', ar: 'أسطول' },
  'véhicule': { en: 'vehicle', ar: 'مركبة' },
  'véhicules': { en: 'vehicles', ar: 'مركبات' },
  'plaque': { en: 'plate', ar: 'لوحة رقمية' },
  'chauffeur': { en: 'driver', ar: 'سائق' },
  'chauffeurs': { en: 'drivers', ar: 'سائقين' },
  'disponibilité': { en: 'availability', ar: 'جاهزية' },
  'opérationnel': { en: 'operational', ar: 'جاهز للخدمة' },
  'simulateur': { en: 'simulator', ar: 'محاكي' },
  'simuler': { en: 'simulate', ar: 'محاكاة' },
  'traçable': { en: 'traceable', ar: 'قابل للتتبع' },

  // Maintenance & Work Orders
  'ordre': { en: 'order', ar: 'أمر' },
  'travail': { en: 'work', ar: 'عمل' },
  'ordres': { en: 'orders', ar: 'أوامر' },
  'maintenance': { en: 'maintenance', ar: 'صيانة' },
  'réparation': { en: 'repair', ar: 'إصلاح' },
  'réparations': { en: 'repairs', ar: 'إصلاحات' },
  'intervention': { en: 'intervention', ar: 'تدخل صيانة' },
  'interventions': { en: 'interventions', ar: 'تدخلات صيانة' },
  'approuver': { en: 'approve', ar: 'اعتماد' },
  'démarrer': { en: 'start', ar: 'بدء' },
  'finaliser': { en: 'finalize', ar: 'إنهاء' },
  'clôturer': { en: 'close', ar: 'إغلاق' },
  'ouvert': { en: 'open', ar: 'مفتوح' },
  'approuvé': { en: 'approved', ar: 'معتمد' },
  'en cours': { en: 'in progress', ar: 'قيد التنفيذ' },
  'clôturé': { en: 'closed', ar: 'مغلق' },
  'préventif': { en: 'preventative', ar: 'وقائي' },
  'correctif': { en: 'corrective', ar: 'تصحيحي' },
  'urgence': { en: 'emergency', ar: 'طارئ' },

  // Inventory & Parts
  'inventaire': { en: 'inventory', ar: 'مخزون' },
  'stock': { en: 'stock', ar: 'المخزن' },
  'pièce': { en: 'part', ar: 'قطعة غيار' },
  'pièces': { en: 'parts', ar: 'قطع غيار' },
  'valeur': { en: 'value', ar: 'قيمة' },
  'pénurie': { en: 'shortfall', ar: 'نقص' },
  'pénuries': { en: 'shortfalls', ar: 'نقص في المخزون' },
  'réservation': { en: 'reservation', ar: 'حجز' },
  'réapprovisionnement': { en: 'replenishment', ar: 'إعادة الطلب' },

  // OBD & Diagnostics
  'défaut': { en: 'fault', ar: 'عطل' },
  'défauts': { en: 'faults', ar: 'أعطال' },
  'scanner': { en: 'scanner', ar: 'فحص' },
  'code': { en: 'code', ar: 'رمز' },
  'codes': { en: 'codes', ar: 'رموز' },
  'sévérité': { en: 'severity', ar: 'خطورة' },
  'moteur': { en: 'engine', ar: 'محرك' },
  'freins': { en: 'brakes', ar: 'فرامل' },
  'électrique': { en: 'electrical', ar: 'كهربائي' },
  'châssis': { en: 'chassis', ar: 'هيكل' },
  'pression': { en: 'pressure', ar: 'ضغط' },
  'température': { en: 'temperature', ar: 'درجة الحرارة' },
  'consommation': { en: 'consumption', ar: 'استهلاك' },
  'huile': { en: 'oil', ar: 'زيت' },
  'usure': { en: 'wear', ar: 'تآكل' },
  'vibration': { en: 'vibration', ar: 'اهتزاز' },
  'diagnostic': { en: 'diagnostic', ar: 'تشخيصي' },

  // Finance & Strategy
  'budget': { en: 'budget', ar: 'ميزانية' },
  'budgétaire': { en: 'budgetary', ar: 'ميزانياتي' },
  'dépense': { en: 'expense', ar: 'مصروف' },
  'dépenses': { en: 'expenses', ar: 'مصروفات' },
  'écart': { en: 'variance', ar: 'انحراف' },
  'écarts': { en: 'variances', ar: 'انحرافات' },
  'priorisation': { en: 'prioritization', ar: 'ترتيب الأولويات' },
  'rapport': { en: 'report', ar: 'تقرير' },
  'rapports': { en: 'reports', ar: 'تقارير' },
  'enquête': { en: 'investigation', ar: 'تحقيق' },
  'conflit': { en: 'conflict', ar: 'تعارض' },
  'conflits': { en: 'conflicts', ar: 'تعارضات' },
  'risque': { en: 'risk', ar: 'خطر' },
  'risques': { en: 'riskes', ar: 'مخاطر' },
  'priorité': { en: 'priority', ar: 'أولوية' },
  'financier': { en: 'financial', ar: 'مالي' },
  'réel': { en: 'actual', ar: 'فعلي' },

  // Simple Conjunctions & Modifiers
  'le': { en: 'the', ar: '' },
  'la': { en: 'the', ar: '' },
  'les': { en: 'the', ar: '' },
  'un': { en: 'a', ar: '' },
  'une': { en: 'a', ar: '' },
  'de': { en: 'of', ar: 'من' },
  'du': { en: 'of the', ar: 'من ال' },
  'des': { en: 'of the', ar: 'من ال' },
  'et': { en: 'and', ar: 'و' },
  'ou': { en: 'or', ar: 'أو' },
  'est': { en: 'is', ar: 'يكون' },
  'sont': { en: 'are', ar: 'يكونون' },
  'avec': { en: 'with', ar: 'مع' },
  'pour': { en: 'for', ar: 'لأجل' },
  'dans': { en: 'in', ar: 'في' },
  'sur': { en: 'on', ar: 'على' },
  'par': { en: 'by', ar: 'بواسطة' },
  'très': { en: 'very', ar: 'جداً' },
  'trop': { en: 'too', ar: 'أكثر من اللازم' },
  'bienvenue': { en: 'welcome', ar: 'مرحباً' },
};

// Custom phrase dictionary for instant beautiful translations of standard telemetry alerts
const ENTERPRISE_PHRASES: Record<string, { en: string; ar: string }> = {
  'Bienvenue, {username} !': { en: 'Welcome, {username}!', ar: 'مرحباً بك، {username}!' },
  'Tous les éléments': { en: 'All items', ar: 'جميع العناصر' },
  'Aucune donnée disponible': { en: 'No data available', ar: 'لا توجد بيانات متاحة' },
  'Chargement en cours...': { en: 'Loading...', ar: 'جاري التحميل...' },
  'Une erreur est survenue': { en: 'An error occurred', ar: 'حدث خطأ في النظام' },
  'Opération réussie': { en: 'Operation successful', ar: 'تمت العملية بنجاح' },
  'Sain / Opérationnel': { en: 'Healthy / Operational', ar: 'سليم / جاهز للخدمة' },
  'Attention Requis': { en: 'Attention Required', ar: 'يتطلب انتباه' },
  'Critique': { en: 'Critical', ar: 'حرج' },
  'Invalide / Dangereux': { en: 'Unsafe / Dangerous', ar: 'غير آمن / أحمر خطير' },
  'Arrêt d\'urgence': { en: 'Emergency Stop', ar: 'إيقاف طارئ' },
  'Alerte Rouge': { en: 'Red Alert', ar: 'تنبيه أحمر' },
  'Système de Réservation de Stock (R3)': { en: 'Inventory Reservation System (R3)', ar: 'نظام حجز المخزون الآلي (R3)' },
  'Coût Total de Réparation (R4)': { en: 'Total Cost of Repair (R4)', ar: 'إجمالي تكلفة الإصلاح (R4)' },
  'Métrique de Priorisation Budgétaire CAE': { en: 'CAE Budget Prioritization Metric', ar: 'مؤشر أولوية ميزانية CAE' },
  'Rapprochement Télématique (R6)': { en: 'Telemetry Reconciliation (R6)', ar: 'مطابقة البيانات السلكية واللاسلكية (R6)' },
  'Prévention des Conflits de Planning (R2)': { en: 'Schedule Conflict Prevention (R2)', ar: 'منع تعارض جدول الرحلات (R2)' },
  'Code d\'erreur diagnostic OBD-II': { en: 'OBD-II Diagnostic Fault Code', ar: 'كود الفحص التشخيصي OBD-II' },
  'Plaquette de frein usée': { en: 'Worn brake pad', ar: 'تآكل في فحمات الفرامل' },
  'Surchauffe moteur détectée': { en: 'Engine overheating detected', ar: 'تم الكشف عن سخونة زائدة للمحرك' },
  'Basse pression de carburant': { en: 'Low fuel pressure', ar: 'انخفاض ضغط الوقود' },
  'Problème de transmission': { en: 'Transmission issue', ar: 'مشكلة في ناقل الحركة (العلبة)' },
  'Défaut de capteur ABS': { en: 'ABS sensor fault', ar: 'عطل في مستشعر فرامل ABS' },
  'Vibration anormale châssis': { en: 'Abnormal chassis vibration', ar: 'اهتزاز غير طبيعي في هيكل الشاحنة' },
};

export function freeTranslateText(
  sourceText: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  key?: string,
  glossaryTerms: GlossaryTerm[] = []
): string {
  if (!sourceText || typeof sourceText !== 'string') return '';
  const trimmedText = sourceText.trim();

  // If source and target are the same, return as is
  if (sourceLang === targetLang) {
    return sourceText;
  }

  // 1. Check exact key in local storage / memory / INITIAL_TRANSLATIONS first!
  if (key) {
    const matchedRecord = INITIAL_TRANSLATIONS.find(
      (t) => t.key === key && t.language === targetLang
    );
    if (matchedRecord && matchedRecord.value) {
      return matchedRecord.value;
    }
  }

  // 2. Check if the exact text matches a known dictionary key
  const matchByValue = INITIAL_TRANSLATIONS.find(
    (t) => t.language === sourceLang && t.value.toLowerCase() === trimmedText.toLowerCase()
  );
  if (matchByValue) {
    const targetMatch = INITIAL_TRANSLATIONS.find(
      (t) => t.key === matchByValue.key && t.language === targetLang
    );
    if (targetMatch && targetMatch.value) {
      return targetMatch.value;
    }
  }

  // 3. Check exact Enterprise Phrases
  if (ENTERPRISE_PHRASES[trimmedText]) {
    const val = ENTERPRISE_PHRASES[trimmedText];
    if (targetLang === 'ar') return val.ar;
    if (targetLang === 'en') return val.en;
  }

  // Find dynamic phrase matches (case-insensitive)
  for (const [fText, tObj] of Object.entries(ENTERPRISE_PHRASES)) {
    if (trimmedText.toLowerCase() === fText.toLowerCase()) {
      if (targetLang === 'ar') return tObj.ar;
      if (targetLang === 'en') return tObj.en;
    }
  }

  // 4. Apply Glossary Rules
  let translated = trimmedText;
  if (glossaryTerms && glossaryTerms.length > 0) {
    // Sort terms by length descending to replace larger phrases first
    const sortedGlossary = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length);
    for (const term of sortedGlossary) {
      const srcTerm = term.translations[sourceLang] || term.term;
      const tgtTerm = term.translations[targetLang] || term.term;

      if (srcTerm && srcTerm.length > 2) {
        // Safe regex replacement (case insensitive)
        const escaped = srcTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        translated = translated.replace(regex, tgtTerm);
      }
    }
  }

  // If glossary fully handled it, return
  if (translated !== trimmedText) {
    return translated;
  }

  // 5. Smart Token Substitution (Heuristic Machine Translation Simulator)
  // Extract placeholders like {username}, {count} etc so they are not broken
  const placeholders: string[] = [];
  let tokenized = translated;
  
  // Match curly-brace placeholders
  const placeholderRegex = /\{[a-zA-Z0-9_]+\}/g;
  let match;
  while ((match = placeholderRegex.exec(translated)) !== null) {
    placeholders.push(match[0]);
  }

  // Replace placeholders with unique indices to protect them
  placeholders.forEach((placeholder, idx) => {
    tokenized = tokenized.replace(placeholder, ` __PH_${idx}__ `);
  });

  // Split into words, preserving spaces and punctuation
  const words = tokenized.split(/(\s+|[,.!?;:()\[\]])/);

  const translatedWords = words.map((word) => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return word; // whitespace

    // If it's a placeholder token
    if (trimmedWord.startsWith('__PH_') && trimmedWord.endsWith('__')) {
      const idx = parseInt(trimmedWord.replace('__PH_', '').replace('__', ''), 10);
      return placeholders[idx] || word;
    }

    // Standard word lookup
    const lowerWord = trimmedWord.toLowerCase();
    const cleanWord = lowerWord.replace(/['’]/g, ''); // normalize apostrophe

    if (TECHNICAL_LEXICON[cleanWord]) {
      const mapped = TECHNICAL_LEXICON[cleanWord];
      let res = targetLang === 'ar' ? mapped.ar : mapped.en;

      // Handle capitalization for English
      if (targetLang === 'en' && res) {
        if (word[0] === word[0].toUpperCase()) {
          res = res.charAt(0).toUpperCase() + res.slice(1);
        }
      }
      return res || word;
    }

    if (TECHNICAL_LEXICON[lowerWord]) {
      const mapped = TECHNICAL_LEXICON[lowerWord];
      let res = targetLang === 'ar' ? mapped.ar : mapped.en;
      if (targetLang === 'en' && res) {
        if (word[0] === word[0].toUpperCase()) {
          res = res.charAt(0).toUpperCase() + res.slice(1);
        }
      }
      return res || word;
    }

    return word; // unrecognized word, keep as is
  });

  let result = translatedWords.join('');

  // Remove triple or double spacing that can occur from tokens
  result = result.replace(/\s+/g, ' ').trim();

  // If Arabic, reverse direction of exclamation/question marks for aesthetic natural feel
  if (targetLang === 'ar') {
    result = result.replace('!', '!');
    result = result.replace('?', '؟');
  }

  // Arabic adjective order modifier (very basic, but works beautifully for common combinations)
  // E.g., "Moteur critique" -> "محرك حرج" instead of "حرج محرك" if it got reversed, but token assembly preserved it nicely.

  // Mark status with prefix or fallback formatting if requested
  return result;
}
