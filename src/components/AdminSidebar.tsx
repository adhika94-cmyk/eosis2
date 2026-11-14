import React from 'react';
import { SchoolSettings, AdminSession } from '../types.ts';
import {
  LayoutDashboard,
  DoorClosed,
  Users,
  GraduationCap,
  Award,
  BarChart3,
  Settings,
  LogOut,
  Vote,
  X,
  Wifi,
  QrCode,
  ShieldCheck
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'classes' | 'students' | 'staff' | 'candidates' | 'results' | 'settings' | 'security';

interface AdminSidebarProps {
  settings: SchoolSettings;
  admin: AdminSession;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNetworkShare?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  settings,
  admin,
  activeTab,
  onSelectTab,
  onLogout,
  isMobileOpen,
  onCloseMobile,
  onOpenNetworkShare
}) => {
  const menuItems: Array<{ id: AdminTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'classes', label: 'Kelas', icon: DoorClosed },
    { id: 'students', label: 'Siswa / DPT', icon: Users },
    { id: 'staff', label: 'Guru & Staff', icon: GraduationCap },
    { id: 'candidates', label: 'Calon Kandidat', icon: Award },
    { id: 'results', label: 'Perolehan Suara', icon: BarChart3 },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
    { id: 'security', label: 'Keamanan & Panitia', icon: ShieldCheck }
  ];

  const handleNavClick = (tab: AdminTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* School Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center p-1.5 shrink-0 shadow-inner">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <Vote className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-sm text-white tracking-tight truncate font-heading">
                  {settings.schoolName || 'SMPN 2 Bogor'}
                </h2>
                <p className="text-[11px] text-blue-400 font-medium">eOSIS &bull; {settings.electionPeriod}</p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Local Wi-Fi & QR Share Button */}
          <div className="px-3 pt-1">
            <button
              type="button"
              onClick={() => {
                onOpenNetworkShare?.();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-600/25 via-indigo-600/20 to-blue-500/15 hover:from-blue-600/35 hover:to-indigo-600/35 border border-blue-500/30 text-white transition-all cursor-pointer group shadow-inner"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Wifi className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">Akses Wi-Fi & QR</div>
                  <div className="text-[10px] text-blue-300/80">Bagi ke HP Siswa</div>
                </div>
              </div>
              <QrCode className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              {admin.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-200 truncate">{admin.name}</div>
              <div className="text-[10px] text-slate-400 truncate">@{admin.username}</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
};
