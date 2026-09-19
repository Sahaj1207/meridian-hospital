import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  Database,
  LockKey,
  Clock,
  Info,
  Bell,
  EnvelopeSimple
} from '@phosphor-icons/react';
import { authService } from '@/services/authService';
import { isSupabaseConfigured } from '@/services/supabaseClient';

export function AdminSettingsPage() {
  const [userRole, setUserRole] = useState<'public' | 'staff' | 'admin'>('public');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuth() {
      try {
        const [role, user] = await Promise.all([
          authService.getUserRole(),
          authService.getCurrentUser()
        ]);
        setUserRole(role);
        if (user && user.email) {
          setUserEmail(user.email);
        } else {
          setUserEmail(null);
        }
      } catch {
        setUserRole('public');
        setUserEmail(null);
      }
    }
    loadAuth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#E5E2D8]">
        <div className="text-[10px] uppercase font-mono tracking-wider text-[#1A635E] font-semibold mb-1">
          SYSTEM POSTURE & GOVERNANCE
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111315]">
          Operational Infrastructure & Security
        </h1>
        <p className="text-xs text-[#555C63] mt-0.5">
          Authoritative runtime parameters, session isolation, and database security posture.
        </p>
      </div>

      {/* Security & Authentication Posture */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111315]">
          <ShieldCheck size={18} className="text-[#1A635E]" />
          <span>Session Authentication & Authority</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Active User Role</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-mono text-xs font-semibold ${
                  userRole === 'admin'
                    ? 'bg-[#153424] text-[#7EE787]'
                    : userRole === 'staff'
                    ? 'bg-[#1A3344] text-[#79C0FF]'
                    : 'bg-[#3E1B1E] text-[#FFA198]'
                }`}
              >
                {userRole.toUpperCase()}
              </span>
              <span className="text-[11px] text-[#555C63]">
                Validated via JWT app_metadata.role
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Authenticated Identity</span>
            <div className="font-mono text-xs text-[#111315] truncate">
              {userEmail || 'Local / Anonymous Session'}
            </div>
          </div>
        </div>
      </div>

      {/* Database & Storage Architecture */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111315]">
          <Database size={18} className="text-[#1A635E]" />
          <span>Operational Data Store & Isolation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Storage Layer</span>
            <div className="font-semibold text-[#111315]">
              {isSupabaseConfigured ? 'Supabase Cloud PostgreSQL' : 'Authoritative In-Memory'}
            </div>
          </div>

          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Table Grants</span>
            <div className="font-semibold text-[#137333] flex items-center gap-1">
              <CheckCircle size={14} weight="fill" />
              <span>RLS Isolation Enforced</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Client Key Posture</span>
            <div className="font-semibold text-[#111315] flex items-center gap-1">
              <LockKey size={14} className="text-[#1A635E]" />
              <span>Anon Public Key Only</span>
            </div>
            <div className="text-[10px] text-[#8A9096]">Service-role keys zero bundled</div>
          </div>
        </div>
      </div>

      {/* Operational Scheduling Timezone & Windows */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111315]">
          <Clock size={18} className="text-[#1A635E]" />
          <span>Scheduling Timezone & Operating Hours</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Hospital Wall Clock</span>
            <div className="font-semibold text-[#111315]">
              Asia/Kolkata (IST, UTC+05:30)
            </div>
            <p className="text-[11px] text-[#768390]">
              Every booking slot, temporary hold, and schedule exception calculates strictly in IST.
            </p>
          </div>

          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">OPD Operating Windows</span>
            <div className="font-semibold text-[#111315]">
              08:00 to 18:00 IST (Informational)
            </div>
            <p className="text-[11px] text-[#768390]">
              Informational standard window. Actual appointment availability is derived authoritatively from individual doctor schedule windows and active exceptions.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Delivery & Reminders Posture */}
      <div className="bg-[#FAF9F6] border border-[#E5E2D8] rounded p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111315]">
          <Bell size={18} className="text-[#1A635E]" />
          <span>Notification & Operations Posture</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Active Provider</span>
            <div className="font-semibold text-[#111315]">
              LocalNotificationProvider
            </div>
            <div className="text-[10px] font-mono text-[#B07219] font-semibold">
              Mode: Development Simulation
            </div>
          </div>

          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Supported Channels</span>
            <div className="font-semibold text-[#111315] flex items-center gap-1">
              <EnvelopeSimple size={14} className="text-[#1A635E]" />
              <span>Email & SMS (Multi-Channel)</span>
            </div>
            <div className="text-[10px] text-[#768390]">Simulated delivery with sanitized logs</div>
          </div>

          <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#768390] block">Reminder Lead Window</span>
            <div className="font-semibold text-[#111315]">
              24 Hours in Asia/Kolkata
            </div>
            <div className="text-[10px] text-[#768390]">Suppresses cancelled and past slots</div>
          </div>
        </div>

        <div className="p-3 rounded bg-[#EDF5F4] border border-[#BCD9D6] text-xs text-[#1A635E] space-y-1">
          <div className="font-semibold">Production Scheduling Notice:</div>
          <p className="text-[11px] text-[#14514D]">
            Automated production dispatch requires a scheduled cron runner or Edge Function invocation. In development, reminder processing is executed through deterministic domain methods.
          </p>
        </div>
      </div>

      {/* Environment Flags */}
      <div className="p-4 rounded bg-[#FAF9F6] border border-[#E5E2D8] text-xs text-[#555C63] flex items-start gap-3">
        <Info size={18} className="text-[#1A635E] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#111315]">Configuration Governance Note</div>
          <p>
            To prevent accidental disruptions to clinical operations, configuration values in this console are read-only telemetry. Operational mutations must be executed through authenticated RPCs and authorized domain services.
          </p>
        </div>
      </div>
    </div>
  );
}
