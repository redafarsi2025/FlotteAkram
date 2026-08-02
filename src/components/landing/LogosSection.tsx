import React from 'react';
import { ShieldCheck, Award, CheckCircle2 } from 'lucide-react';

interface LogosSectionProps {
  currentLanguage: string;
}

export const LogosSection: React.FC<LogosSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  
  const partnerTitle = isAr
    ? 'الشركاء الاستراتيجيون والمؤسسات المعتمدة في الجزائر'
    : currentLanguage === 'en'
    ? 'Strategic Partners & Certified Organizations in Algeria'
    : 'Partenaires Stratégiques & Organismes Certifiés en Algérie';

  const certTitle = isAr
    ? 'معايير الامتثال والجودة الوطنية'
    : currentLanguage === 'en'
    ? 'National Compliance & Quality Standards'
    : 'Normes de Conformité & Qualité Nationale';

  const companies = [
    { name: 'Cosider Group', sector: 'BTP & Construction' },
    { name: 'Sonatrach', sector: 'Hydrocarbures & Énergie' },
    { name: 'Naftal', sector: 'Distribution & Carburant' },
    { name: 'Sonelgaz', sector: 'Énergie & Logistique' },
    { name: 'SNTF', sector: 'Transport Ferroviaire' },
    { name: 'Logitrans', sector: 'Transport Routier & Fret' },
  ];

  const certs = [
    { code: 'DZD Compliance', label: 'SCF Standard & Facturation locale' },
    { code: 'ISO 9001:2015', label: 'Management de la Qualité de Flotte' },
    { code: 'ANDI / API', label: 'Agrément investissements industriels' },
  ];

  return (
    <div className="py-8 border-y border-slate-200/60 bg-slate-50/50 rounded-3xl space-y-8">
      <div className="text-center space-y-1">
        <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
          {isAr ? 'الثقة والامتثال' : currentLanguage === 'en' ? 'TRUST & COMPLIANCE' : 'CONFIANCE & CONFORMITÉ'}
        </span>
        <h3 className="text-xs font-bold text-slate-500 font-sans">
          {partnerTitle}
        </h3>
      </div>

      {/* Trust Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6 px-6 items-center">
        {companies.map((co, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/50 hover:border-indigo-100 hover:shadow-xs transition duration-200 text-center"
          >
            <span className="font-black text-slate-800 tracking-tight text-xs block">
              {co.name}
            </span>
            <span className="text-[9px] text-slate-400 font-medium font-sans mt-0.5">
              {co.sector}
            </span>
          </div>
        ))}
      </div>

      {/* Certifications Row */}
      <div className="flex flex-wrap items-center justify-center gap-6 px-6 pt-2 border-t border-slate-200/30">
        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
          <Award className="h-3.5 w-3.5 text-indigo-500" />
          {certTitle}:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {certs.map((c, i) => (
            <div 
              key={i} 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>{c.code}</span>
              <span className="text-emerald-500 font-normal">| {c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
