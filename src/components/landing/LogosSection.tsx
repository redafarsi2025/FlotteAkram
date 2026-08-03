import React from 'react';
import { ShieldCheck, Award, CheckCircle2 } from 'lucide-react';

interface LogosSectionProps {
  currentLanguage: string;
}

export const LogosSection: React.FC<LogosSectionProps> = ({ currentLanguage }) => {
  const isAr = currentLanguage === 'ar';
  
  const partnerTitle = isAr
    ? 'مشروع موجه وموثق بدقة'
    : currentLanguage === 'en'
    ? 'Academically Supervised & Rigorously Documented'
    : 'Un projet encadré et rigoureusement documenté';

  const certTitle = isAr
    ? 'معايير الجودة والمنهجية'
    : currentLanguage === 'en'
    ? 'Methodology & Data Quality Standards'
    : 'Normes de Méthodologie & Qualité';

  const credibility = [
    { name: 'ESGEN Incubator', sector: 'Structure d\'accompagnement 2025/2026' },
    { name: 'Pr. Rafika Tabti', sector: 'Encadrement BI & IT' },
    { name: 'Pr. Leila Douidene', sector: 'Encadrement Logistique & Supply Chain' },
    { name: 'ONS / joradp.dz', sector: 'Données de marché sourcées et vérifiables' },
  ];

  const certs = [
    { code: 'Matrice de Confiance', label: 'Chaque donnée classée VÉRIFIÉ / ESTIMÉ / BENCHMARK' },
    { code: 'SCF Ready', label: 'Architecture conforme au plan comptable algérien' },
  ];

  return (
    <div className="py-8 border-y border-slate-200/60 bg-slate-50/50 rounded-3xl space-y-8">
      <div className="text-center space-y-1">
        <span className="text-[10px] uppercase text-indigo-600 font-extrabold tracking-wider block">
          {isAr ? 'الثقة والشفافية' : currentLanguage === 'en' ? 'TRUST & TRANSPARENCY' : 'CONFIANCE & TRANSPARENCE'}
        </span>
        <h3 className="text-xs font-bold text-slate-500 font-sans">
          {partnerTitle}
        </h3>
      </div>

      {/* Credibility Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-6 items-center">
        {credibility.map((co, index) => (
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

      {/* Method Badges Row */}
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
