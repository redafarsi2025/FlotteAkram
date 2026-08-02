import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { ROLES_CONFIG } from '../../data/seedData';
import { Role } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  Bell,
  ChevronDown,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Wrench,
  Package,
  Activity,
  UserCheck,
  Truck,
  Users,
  KeyRound,
  LogIn,
  LogOut,
} from 'lucide-react';
import { AlertFeedModal } from './AlertFeedModal';
import { GoldenPathModal } from './GoldenPathModal';
import { RoleSelectorModal } from './RoleSelectorModal';
import { AuthModal } from './AuthModal';
import { LanguageSelector } from '../localization/LanguageSelector';

export const TopBar: React.FC = () => {
  const { currentRole, changeRole, alerts, resetSeedData, isRoleSelectorOpen, setIsRoleSelectorOpen, currentUser } = useFleet();
  const { t } = useLocalization();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showGoldenPathModal, setShowGoldenPathModal] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const activeRoleInfo = ROLES_CONFIG.find((r) => r.id === currentRole) || ROLES_CONFIG[0];
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  const getRoleIcon = (roleId: Role) => {
    switch (roleId) {
      case 'DIRECTOR':
        return TrendingUp;
      case 'MGMT_CONTROLLER':
        return ShieldCheck;
      case 'TECHNICAL_CONTROLLER':
        return Activity;
      case 'LOGISTICS_CONTROLLER':
        return Package;
      case 'FLEET_MANAGER':
        return UserCheck;
      case 'MECHANIC':
        return Wrench;
      case 'DRIVER':
        return Truck;
      default:
        return Users;
    }
  };

  const Icon = getRoleIcon(activeRoleInfo.id);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 lg:px-6 backdrop-blur-md">
        {/* Left: Brand & Demo Scenarios */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-base shadow-sm">
              NX
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                NextTransit
              </span>
              <span className="ml-2 hidden sm:inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                {t('topbar.subtitle', {}, '7 Role-Based Views • 1 Shared Model')}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowGoldenPathModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            title="Open Interactive Demo Scenarios (Golden Path A & B)"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t('topbar.demo_scenarios', {}, 'Demo Scenarios (Golden Path A/B)')}</span>
            <span className="md:hidden">Scenarios</span>
          </button>
        </div>

        {/* Right: Role Switcher, Language Selector, Reset Data, and Open Alerts */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Reset Seed Data */}
          <button
            onClick={() => {
              resetSeedData();
            }}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title={t('topbar.reset_tooltip', {}, 'Reset to clean initial seed data')}
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>{t('topbar.reset_data', {}, 'Reset Data')}</span>
          </button>

          {/* Auth & Security Modal Toggle */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-xs font-medium text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-md max-w-[150px] truncate" title={currentUser.email}>
                {currentUser.email}
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                title={t('topbar.logout', {}, 'Déconnexion de la session')}
              >
                <LogOut className="h-3.5 w-3.5 text-red-600" />
                <span>{t('topbar.logout_label', {}, 'Déconnexion')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
              title={t('topbar.login', {}, 'Connexion / Création de compte')}
            >
              <LogIn className="h-3.5 w-3.5 text-indigo-600" />
              <span>{t('topbar.login_label', {}, 'Connexion')}</span>
            </button>
          )}

          {/* Alert count button */}
          <button
            onClick={() => setShowAlertModal(true)}
            className="relative inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            title="View Active Rule Alerts (R1-R7)"
          >
            <Bell className="h-5 w-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 shadow-xs hover:border-slate-300 transition cursor-pointer"
              title="Switch Role Without Logging Out"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-xs ${activeRoleInfo.badgeColor}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-900 leading-none">
                  {activeRoleInfo.name}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                  Role Switcher
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRoleMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white p-2 shadow-xl border border-slate-200 z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Switch Role (7 RBAC Views)
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All roles share the same reactive data model.
                    </p>
                  </div>

                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {ROLES_CONFIG.map((role) => {
                      const RoleIcon = getRoleIcon(role.id);
                      const isCurrent = currentRole === role.id;
                      return (
                        <button
                          key={role.id}
                          onClick={() => {
                            changeRole(role.id);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-50 text-indigo-900 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-md text-white text-xs ${role.badgeColor}`}
                            >
                              <RoleIcon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold">{role.name}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">
                                {role.title}
                              </div>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        setIsRoleSelectorOpen(true);
                      }}
                      className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1"
                    >
                      Open Role Selector Screen
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {showAlertModal && <AlertFeedModal onClose={() => setShowAlertModal(false)} />}
      {showGoldenPathModal && (
        <GoldenPathModal onClose={() => setShowGoldenPathModal(false)} />
      )}
      {isRoleSelectorOpen && (
        <RoleSelectorModal onClose={() => setIsRoleSelectorOpen(false)} />
      )}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
};
