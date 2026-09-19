import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ChartBar,
  CalendarCheck,
  UserCircle,
  Buildings,
  Clock,
  Users,
  Gear,
  ShieldCheck,
  SignOut,
  SignIn,
  WarningCircle
} from '@phosphor-icons/react';
import { authService } from '@/services/authService';
import { isSupabaseConfigured } from '@/services/supabaseClient';

export function AdminLayout() {
  const [userRole, setUserRole] = useState<'public' | 'staff' | 'admin'>('public');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [istTime, setIstTime] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  // Keep live IST clock ticking
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setIstTime(`${formatter.format(now)} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch authenticated session & role
  const refreshAuth = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setUserRole(user.role);
        setUserEmail(user.email || null);
      } else {
        const role = await authService.getUserRole();
        setUserRole(role);
        setUserEmail(null);
      }
    } catch {
      setUserRole('public');
      setUserEmail(null);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, [location.pathname]);

  const handleSignOut = async () => {
    await authService.signOut();
    setUserRole('public');
    setUserEmail(null);
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: ChartBar, end: true },
    { to: '/admin/appointments', label: 'Appointments', icon: CalendarCheck },
    { to: '/admin/doctors', label: 'Doctors', icon: UserCircle },
    { to: '/admin/departments', label: 'Departments', icon: Buildings },
    { to: '/admin/schedules', label: 'Schedules', icon: Clock },
    { to: '/admin/patients', label: 'Patients', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Gear }
  ];

  const isLoginPage = location.pathname === '/admin/login';

  return (
    <div className="min-h-screen bg-[#F4F2EC] text-[#111315] font-sans flex flex-col">
      {/* Top Institutional Bar */}
      <header className="bg-[#111315] text-[#FAF9F6] border-b border-[#222528] sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#1A635E] text-[#FAF9F6] flex items-center justify-center font-serif text-lg font-bold">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-[#9EA7B0] uppercase">
                  MERIDIAN HOSPITAL MUMBAI
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#20252A] text-[#7EE787] border border-[#2D333B]">
                  LIVE SYSTEM
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-[#FAF9F6]">
                Clinical & Administrative Operations Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            {/* IST Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1B2026] border border-[#2D333B] text-[#D0D7DE]">
              <Clock size={14} className="text-[#1A635E]" />
              <span>{istTime || 'IST (UTC+05:30)'}</span>
            </div>

            {/* Role Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs ${
                userRole === 'admin'
                  ? 'bg-[#153424] border-[#2EA043] text-[#7EE787]'
                  : userRole === 'staff'
                  ? 'bg-[#1A3344] border-[#388BFD] text-[#79C0FF]'
                  : 'bg-[#3E1B1E] border-[#F85149] text-[#FFA198]'
              }`}
            >
              <ShieldCheck size={14} />
              <span>
                Role: <strong className="uppercase">{userRole}</strong>
              </span>
            </div>

            {/* User session / Sign out */}
            {userRole !== 'public' ? (
              <div className="flex items-center gap-2">
                {userEmail && (
                  <span className="hidden lg:inline text-[11px] text-[#8B949E]">
                    {userEmail}
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#3D444D] text-[#FAF9F6] transition-colors cursor-pointer text-xs"
                  title="Sign out of staff session"
                >
                  <SignOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : !isLoginPage ? (
              <button
                onClick={() => navigate('/admin/login')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] transition-colors cursor-pointer text-xs"
              >
                <SignIn size={14} />
                <span>Staff Sign In</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Primary Workspace */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto">
        {/* Sidebar Navigation */}
        {!isLoginPage && (
          <aside className="w-full md:w-64 bg-[#FAF9F6] border-r border-[#E5E2D8] p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A9096] mb-2 px-3">
                  OPERATIONAL SUITE
                </p>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
                            isActive
                              ? 'bg-[#1A635E] text-[#FAF9F6] shadow-sm font-semibold'
                              : 'text-[#222528] hover:bg-[#F4F2EC] hover:text-[#111315]'
                          }`
                        }
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Data Store Information */}
              <div className="p-3 rounded bg-[#F4F2EC] border border-[#E5E2D8] text-[11px] text-[#555C63] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-mono text-[#8A9096]">
                  <span>Backend Storage</span>
                  <span className="w-2 h-2 rounded-full bg-[#1A635E]"></span>
                </div>
                <div className="font-medium text-[#222528]">
                  {isSupabaseConfigured ? 'Supabase PostgreSQL Cloud' : 'Authoritative Local Memory'}
                </div>
                <div className="text-[10px] text-[#7A828A]">
                  Enforcing PostgreSQL RLS & Schema Grants
                </div>
              </div>
            </div>

            {/* Footer notice */}
            <div className="pt-4 border-t border-[#E5E2D8] text-[10px] text-[#8A9096] space-y-1">
              <p>Meridian Hospital Mumbai</p>
              <p>Confidential Clinical Console</p>
            </div>
          </aside>
        )}

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Access Warning if viewing protected section without credentials */}
          {userRole === 'public' && !isLoginPage && (
            <div className="mb-6 p-4 rounded bg-[#FFF8E6] border border-[#FFE08A] text-[#7A5400] flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <WarningCircle size={20} className="shrink-0 mt-0.5 text-[#B8860B]" />
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider">
                    Unauthenticated Operational View
                  </h2>
                  <p className="text-xs text-[#8A6200] mt-0.5">
                    Operational queues, appointment rescheduling, and schedule modifications require authenticated staff or administrator credentials.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/login')}
                className="px-3 py-1.5 text-xs font-semibold bg-[#111315] hover:bg-[#222528] text-[#FAF9F6] rounded transition-colors cursor-pointer shrink-0"
              >
                Sign In
              </button>
            </div>
          )}

          <Outlet context={{ userRole, refreshAuth }} />
        </main>
      </div>
    </div>
  );
}
