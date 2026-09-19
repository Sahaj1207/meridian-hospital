import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Envelope, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { authService } from '@/services/authService';
import { isProductionEnvironment } from '@/services/supabaseClient';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your institutional email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await authService.signIn({ email, password });
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      setSuccess(`Authenticated successfully as ${res.user?.role?.toUpperCase() || 'STAFF'}. Redirecting...`);
      setTimeout(() => {
        navigate('/admin');
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.signIn({ email: demoEmail, password: 'demo-password' });
      if (res.success) {
        setSuccess(`Demo session active as ${res.user?.role?.toUpperCase()}. Redirecting...`);
        setTimeout(() => {
          navigate('/admin');
        }, 500);
      } else {
        setError(res.error || 'Demo authentication failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FAF9F6] border border-[#E5E2D8] rounded shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded bg-[#1A635E] text-[#FAF9F6] mx-auto flex items-center justify-center text-xl font-bold font-serif">
            M
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[#111315]">
            Staff Operations Sign In
          </h1>
          <p className="text-xs text-[#555C63]">
            Access restricted to verified clinical coordinators, medical officers, and hospital administration.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#FCE8E6] border border-[#F85149] text-[#9E2A2B] rounded text-xs flex items-start gap-2">
            <WarningCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-[#E6F4EA] border border-[#2EA043] text-[#137333] rounded text-xs flex items-start gap-2">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#222528] block">
              Institutional Email
            </label>
            <div className="relative">
              <Envelope size={16} className="absolute left-3 top-3 text-[#8A9096]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@meridianhospital.in"
                required
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#222528] block">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-[#8A9096]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#E5E2D8] rounded text-[#111315] focus:outline-none focus:border-[#1A635E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] text-xs font-semibold rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Console'}
          </button>
        </form>

        {/* Demo Fast-Switch Buttons for Testing / Verification */}
        {!isProductionEnvironment() && (
          <div className="pt-4 border-t border-[#E5E2D8] space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#8A9096] text-center">
              Quick Role Switch (Local / Verification)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn('staff.operations@meridianhospital.in')}
                disabled={loading}
                className="py-1.5 px-2 bg-[#F4F2EC] hover:bg-[#EAE7DE] border border-[#E5E2D8] text-[11px] font-medium text-[#222528] rounded cursor-pointer transition-colors"
              >
                Staff (Operational)
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('admin.operations@meridianhospital.in')}
                disabled={loading}
                className="py-1.5 px-2 bg-[#F4F2EC] hover:bg-[#EAE7DE] border border-[#E5E2D8] text-[11px] font-medium text-[#222528] rounded cursor-pointer transition-colors"
              >
                Admin (Full Rights)
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-[10px] text-[#8A9096]">
          Role verification is strictly checked from app_metadata.role.
        </div>
      </div>
    </div>
  );
}
