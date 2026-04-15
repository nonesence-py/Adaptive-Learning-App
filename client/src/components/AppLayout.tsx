import { useAuth } from '@/contexts/AuthContext';
import { getLevelInfo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Brain, Timer, BookX, RefreshCw, Trophy,
  Network, FileText, NotebookPen, BarChart3, LogOut, ChevronLeft,
  ChevronRight, Zap, Menu, X, Crown, LineChart, Settings,
  ChevronDown, GraduationCap, ClipboardList, FlaskConical
} from 'lucide-react';
import { useState, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface NavGroup {
  label: string;
  icon: any;
  items: { path: string; label: string; icon: any }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Learning',
    icon: GraduationCap,
    items: [
      { path: '/learn', label: 'Adaptive Learning', icon: Brain },
      { path: '/challenge', label: 'Timed Challenge', icon: Timer },
    ],
  },
  {
    label: 'Review',
    icon: ClipboardList,
    items: [
      { path: '/wrong-questions', label: 'Wrong Questions', icon: BookX },
      { path: '/review', label: 'Spaced Review', icon: RefreshCw },
      { path: '/notes', label: 'Study Notes', icon: NotebookPen },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    items: [
      { path: '/achievements', label: 'Achievements', icon: Trophy },
      { path: '/knowledge-graph', label: 'Knowledge Graph', icon: Network },
      { path: '/report', label: 'Study Report', icon: FileText },
      { path: '/leaderboard', label: 'Leaderboard', icon: Crown },
      { path: '/insights', label: 'Insights', icon: LineChart },
      { path: '/algorithm', label: 'Algorithm Demo', icon: FlaskConical },
    ],
  },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, profile, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of NAV_GROUPS) {
      initial[group.label] = true;
    }
    return initial;
  });

  const levelInfo = profile ? getLevelInfo(profile.xp) : null;

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo - compact */}
      <div className="px-3 py-2.5 flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shrink-0">
          <Zap size={16} />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate leading-tight">AdaptLearn</h1>
            <p className="text-[9px] text-muted-foreground leading-tight">Intelligent Learning</p>
          </motion.div>
        )}
      </div>

      {/* Nav Groups - scrollable */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scrollbar-thin min-h-0">
        {NAV_GROUPS.map((group) => {
          const isGroupActive = group.items.some(item => location === item.path);
          const isExpanded = expandedGroups[group.label] ?? false;
          const GroupIcon = group.icon;

          if (collapsed) {
            return group.items.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  title={item.label}
                  className={cn(
                    'w-full flex items-center justify-center p-1.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
                  )}
                >
                  <Icon size={15} className={cn(isActive ? 'text-blue-500' : '')} />
                </button>
              );
            });
          }

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200',
                  isGroupActive
                    ? 'text-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GroupIcon size={13} className={cn(isGroupActive ? 'text-blue-500' : '')} />
                <span className="flex-1 text-left">{group.label}</span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={11} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2.5 pl-2.5 border-l border-blue-100">
                      {group.items.map((item) => {
                        const isActive = location === item.path;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2.5 py-[5px] rounded-md text-[12px] font-medium transition-all duration-200',
                              isActive
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
                            )}
                          >
                            <Icon size={13} className={cn(isActive ? 'text-blue-500' : '')} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Settings */}
        {!collapsed ? (
          <button
            onClick={() => handleNav('/settings')}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all duration-200 mt-0.5',
              location === '/settings'
                ? 'bg-blue-500/10 text-blue-600'
                : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
            )}
          >
            <Settings size={13} className={cn(location === '/settings' ? 'text-blue-500' : '')} />
            <span className="truncate">Settings</span>
          </button>
        ) : (
          <button
            onClick={() => handleNav('/settings')}
            title="Settings"
            className={cn(
              'w-full flex items-center justify-center p-1.5 rounded-lg transition-all duration-200',
              location === '/settings'
                ? 'bg-blue-500/10 text-blue-600'
                : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
            )}
          >
            <Settings size={15} className={cn(location === '/settings' ? 'text-blue-500' : '')} />
          </button>
        )}
      </nav>

      {/* User Info - very compact */}
      {profile && !collapsed && (
        <div className="px-2 pb-1 shrink-0">
          <div className="p-2 rounded-lg bg-white/50 border border-white/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                {user?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-foreground truncate leading-tight">{user}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">
                  {levelInfo?.icon} Lv.{levelInfo?.level} · {profile.xp} XP
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center p-1.5 mx-2 mb-1.5 rounded-md text-muted-foreground hover:bg-white/60 transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col glass-sidebar shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 glass-sidebar flex items-center px-4 gap-3">
        <button onClick={() => setMobileOpen(true)} className="text-foreground">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <Zap size={14} />
          </div>
          <span className="text-sm font-bold">AdaptLearn</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[240px] z-50 glass-sidebar"
            >
              <div className="absolute top-2 right-2">
                <button onClick={() => setMobileOpen(false)} className="text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
