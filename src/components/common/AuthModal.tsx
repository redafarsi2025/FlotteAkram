import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { LogIn, LogOut, User, ShieldCheck, X, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { Role } from '../../types';

interface AuthModalProps {
  onClose: () => void;
  initialIsSignUp?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialIsSignUp = false }) => {
  const { changeRole, activeTenantId, setActiveTenantId, tenantConfigs } = useFleet();
  const { t } = useLocalization();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(activeTenantId || 'TNT-NEXTR-001');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSessionUser, setActiveSessionUser] = useState<any>(null);
  const [assignedRole, setAssignedRole] = useState<string>('UNASSIGNED');

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setActiveSessionUser(session.user);
        // Query profile to see details
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) {
          setAssignedRole(profile.role);
        } else {
          setAssignedRole('UNASSIGNED');
        }
      }
    });
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        // Query the profile row for role/tenant source of truth
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('tenant_id, role')
          .eq('id', data.session.user.id)
          .single();

        let finalRole: Role = 'UNASSIGNED';
        let finalTenantId = activeTenantId || 'TNT-NEXTR-001';

        if (profile && !profileErr && profile.role) {
          finalRole = profile.role as Role;
          if (profile.tenant_id) {
            finalTenantId = profile.tenant_id;
          }
        }

        setActiveSessionUser(data.session.user);
        changeRole(finalRole);
        setActiveTenantId(finalTenantId);
        setAssignedRole(finalRole);

        if (finalRole === 'UNASSIGNED') {
          setSuccessMsg(`Connexion réussie (${data.session.user.email}). Aucun rôle attribué — En attente d'affectation par le gestionnaire superutilisateur SaaS.`);
        } else {
          setSuccessMsg(`Authenticated successfully as ${data.session.user.email} (Role: ${finalRole}, Tenant: ${finalTenantId})`);
        }
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter email and password to create an account.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Create user with unassigned role metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            tenant_id: selectedTenantId,
            role: 'UNASSIGNED',
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(`Compte créé avec succès. Aucun rôle n'est attribué par défaut. Le rôle et l'espace de travail doivent être affectés par le gestionnaire superutilisateur du SaaS.`);
        setIsSignUp(false);
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setActiveSessionUser(null);
    setSuccessMsg('Signed out of Supabase session.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                {t('auth.title', {}, 'NextTransit Enterprise Auth & RLS')}
              </h3>
              <p className="text-xs text-slate-300">
                {t('auth.subtitle', {}, 'Supabase JWT Session & Multi-Tenant Security Policy')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeSessionUser ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Active Supabase Auth Session Verified</span>
              </div>
              <div className="text-xs text-slate-700 space-y-1 font-mono">
                <div><strong className="font-sans text-slate-900">User ID:</strong> {activeSessionUser.id}</div>
                <div><strong className="font-sans text-slate-900">Email:</strong> {activeSessionUser.email}</div>
                <div><strong className="font-sans text-slate-900">Active Tenant ID:</strong> {activeTenantId}</div>
                <div><strong className="font-sans text-slate-900">Assigned Role:</strong> {assignedRole}</div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of Supabase Session</span>
              </button>
            </div>
          ) : (
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition ${!isSignUp ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition ${isSignUp ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User Email (Supabase Auth)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@nexttransit.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {isSignUp && (
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Note de Sécurité & Rôles :</span> Aucun rôle n'est attribué par défaut lors de l'inscription (Statut : <strong className="font-sans text-slate-800">NON ASSIGNÉ</strong>). Le rôle et les autorisations de l'espace de travail doivent être explicitement configurés par le gestionnaire superutilisateur du SaaS.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{loading ? 'Processing...' : isSignUp ? 'Register Account' : 'Sign In with Supabase'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Technical Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Multi-Tenant Row Level Security (RLS) Active</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every request is scoped by <code className="bg-slate-200 px-1 rounded text-slate-800">tenant_id</code> and user profile rows in PostgreSQL, preventing cross-tenant leakage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
