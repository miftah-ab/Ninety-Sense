import React from 'react';
import { LayoutDashboard, Film, Clapperboard, Image, Cpu, Sliders, Menu, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';

export type TabKey = 'dashboard' | 'videos' | 'production' | 'brand' | 'integrations' | 'settings';

interface Props {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  selectedVideoTitle?: string;
  hasReferenceImage: boolean;
  user: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  selectedVideoTitle,
  hasReferenceImage,
  user,
  onAuthChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'videos', label: 'Videos', icon: <Film className="w-4 h-4" /> },
    { key: 'production', label: 'Scene Production', icon: <Clapperboard className="w-4 h-4" /> },
    { key: 'brand', label: 'Brand Assets', icon: <Image className="w-4 h-4" /> },
    { key: 'integrations', label: 'Integrations', icon: <Cpu className="w-4 h-4" /> },
    { key: 'settings', label: 'Settings & Logs', icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F2] border-b border-[#D7D0C0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
              <div className="w-8 h-8 rounded bg-[#1C1B19] flex items-center justify-center text-[#F4F0E6] font-bold text-xs tracking-widest border border-[#1C1B19]">
                90
              </div>
              <div>
                <span className="text-sm font-bold tracking-wider text-[#1C1B19] block leading-tight">
                  NINETY SENSE
                </span>
                <span className="text-[10px] tracking-widest text-[#A94336] uppercase font-semibold block">
                  VISUAL PRODUCTION OS
                </span>
              </div>
            </div>

            {/* Reference status badge in header */}
            <div className="hidden lg:flex items-center gap-2">
              {hasReferenceImage ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7EFE8] border border-[#C5D9C8] text-[#366340] text-[11px] font-medium cursor-pointer"
                  onClick={() => onTabChange('brand')}
                  title="Official reference image loaded and ready"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#366340]" />
                  <span>Reference Loaded</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FBECEB] border border-[#EAC4C1] text-[#A94336] text-[11px] font-medium cursor-pointer"
                  onClick={() => onTabChange('brand')}
                  title="Mandatory reference image missing - click to upload"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-[#A94336]" />
                  <span>Missing Reference</span>
                </div>
              )}

              {selectedVideoTitle && (
                <div
                  className="px-2.5 py-1 rounded bg-[#ECE6D8] border border-[#D7D0C0] text-[#1C1B19] text-[11px] font-medium truncate max-w-[200px] cursor-pointer"
                  onClick={() => onTabChange('production')}
                  title={`Active video: ${selectedVideoTitle}`}
                >
                  <span className="text-[#625E56] font-normal">Active: </span>
                  {selectedVideoTitle}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#A94336] text-[#F4F0E6] shadow-xs'
                      : 'text-[#625E56] hover:text-[#1C1B19] hover:bg-[#ECE6D8]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action: Google Sign-in & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <GoogleSignInButton user={user} onAuthChange={onAuthChange} />
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded text-[#625E56] hover:text-[#1C1B19] hover:bg-[#ECE6D8]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF8F2] border-b border-[#D7D0C0] px-4 pt-2 pb-4 space-y-2">
          <div className="pb-2 border-b border-[#D7D0C0] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#625E56]">Navigation</span>
            <GoogleSignInButton user={user} onAuthChange={onAuthChange} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onTabChange(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#A94336] text-[#F4F0E6]'
                      : 'text-[#625E56] bg-[#ECE6D8]/50 hover:bg-[#ECE6D8]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
