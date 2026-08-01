import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { LogIn, LogOut, User, ShieldCheck, X, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { ROLES_CONFIG } from '../../data/seedData';
import { Role } from '../../types';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { currentRole, changeRole, activeTenantId, setActiveTenantId } = useFleet();
  const { t } = useLocalization();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantInput, setTenantInput] = useState(activeTenantId);
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSessionUser, setActiveSessionUser] = useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setActiveSessionUser(session.user);
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
        // If authentication failed in Supabase, provide a helpful demo-friendly experience
        setErrorMsg(error.message);
      } else if (data.session) {
        setActiveSessionUser(data.session.user);
        changeRole(selectedRole);
        setActiveTenantId(tenantInput);
        setSuccessMsg(`Authenticated successfully as ${data.session.user.email}`);
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter email and password to create an account.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            tenant_id: tenantInput,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Account created successfully. User credentials registered in Supabase Auth.');
        if (data.user) {
          setActiveSessionUser(data.user);
          changeRole(selectedRole);
          setActiveTenantId(tenantInput);
        }
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
                <div><strong className="font-sans text-slate-900">Assigned Role:</strong> {currentRole}</div>
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
            <form onSubmit={handleSignIn} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Multi-Tenant ID
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={tenantInput}
                      onChange={(e) => setTenantInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target RBAC Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as Role)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {ROLES_CONFIG.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In with Supabase'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Register User
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
              Every request is scoped by <code className="bg-slate-200 px-1 rounded text-slate-800">tenant_id</code> and JWT claims in PostgreSQL, preventing cross-tenant leakage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
