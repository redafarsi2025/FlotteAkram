import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';

export const ForbiddenScreen: React.FC = () => {
  const { currentRole, userProfile, changeScreen } = useAuth();
  const { t } = useLocalization();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-6 shadow-sm">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
        403 — Access Denied
      </h1>
      <p className="text-base text-slate-600 max-w-md mb-6">
        Your current account role (<span className="font-semibold text-slate-800">{currentRole}</span>) does not have permission to access this operational module or screen.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-left text-xs space-y-2 text-slate-600 w-full max-w-md">
        <div className="flex justify-between">
          <span className="font-medium text-slate-700">Account User:</span>
          <span>{userProfile?.full_name || 'Authenticated User'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-slate-700">Assigned Role:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{currentRole}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-slate-700">Tenant Workspace:</span>
          <span>{userProfile?.tenant_id || 'Default Tenant'}</span>
        </div>
      </div>

      <button
        onClick={() => changeScreen('LANDING_PAGE')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home / Dashboard
      </button>
    </div>
  );
};
