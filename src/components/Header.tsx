import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  PlusCircle,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Info,
  ExternalLink,
} from 'lucide-react';
import { api, getActiveUser, setActiveUser } from '../api';
import { NotificationItem, UserProfile, UserRole } from '../types';

interface HeaderProps {
  onNavigate: (viewId: string) => void;
  onOpenAssistant: () => void;
  activeDisruptionCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenAssistant,
  activeDisruptionCount,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(getActiveUser());
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  useEffect(() => {
    loadHeaderData();
    const handleUserChanged = () => {
      setCurrentUser(getActiveUser());
      loadHeaderData();
    };
    window.addEventListener('chainpulse:user-changed', handleUserChanged);
    const interval = setInterval(loadHeaderData, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chainpulse:user-changed', handleUserChanged);
    };
  }, []);

  const loadHeaderData = async () => {
    try {
      const [allProfiles, notifs] = await Promise.all([
        api.getProfiles(),
        api.getNotifications(),
      ]);
      setProfiles(allProfiles);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load header data:', err);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    const matchedProfile = profiles.find((p) => p.role === role) || {
      id: `usr_${role.toLowerCase().replace(/[^a-z]/g, '')}`,
      email: `${role.toLowerCase().replace(/[^a-z]/g, '')}@chainpulse.ai`,
      fullName: `Active User (${role})`,
      role,
      createdAt: new Date().toISOString(),
    };
    setActiveUser(matchedProfile);
    setCurrentUser(matchedProfile);
    setShowRoleDropdown(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      {/* Top Banner Alert Ticker for Active Disruptions */}
      {activeDisruptionCount > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-semibold uppercase tracking-wider">Active Alert:</span>
            <span>
              {activeDisruptionCount} critical supply chain disruptions active in network. Ripple impact is actively propagating.
            </span>
          </div>
          <button
            onClick={() => onNavigate('disruptions')}
            className="font-medium underline hover:text-amber-100 flex items-center gap-1 transition-colors"
          >
            Investigate Disruptions <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-cyan-400 font-black text-lg tracking-tighter">CP</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">ChainPulse</span>
                <span className="text-[10px] font-semibold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">
                  AI v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Detect Disruptions. Predict Impact. Recover Intelligently.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions, AI Copilot, Role Switcher, Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add New Data Prominent Button */}
          <button
            onClick={() => onNavigate('add-data')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm shadow-blue-600/30 transition-all active:scale-95"
            title="Add New Supply Chain Data"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden md:inline">Add New Data</span>
          </button>

          {/* AI Copilot Button */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-cyan-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            title="Ask ChainPulse AI Copilot"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No notifications recorded
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setShowNotifDropdown(false);
                          if (notif.link) {
                            onNavigate(notif.link.replace('/', ''));
                          }
                        }}
                        className={`p-3 text-xs hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          !notif.isRead ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {notif.type === 'danger' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          ) : notif.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : notif.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-slate-200">{notif.title}</p>
                            <p className="text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              {new Date(notif.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 text-center">
                  <button
                    onClick={() => {
                      setShowNotifDropdown(false);
                      onNavigate('notifications');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Dropdown (Allows testing all 5 roles) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white text-[10px]">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="text-left hidden lg:block">
                <p className="font-medium text-slate-200 leading-tight">{currentUser.fullName}</p>
                <p className="text-[10px] text-cyan-400 leading-tight">{currentUser.role}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-slate-300">Switch Role Simulation</p>
                  <p className="text-[10px] text-slate-400">Test role-based permissions & approvals</p>
                </div>
                {[
                  'Administrator',
                  'Supply Chain Manager',
                  'Operations Analyst',
                  'Procurement Approver',
                  'Warehouse Operator',
                ].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role as UserRole)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      currentUser.role === role ? 'text-blue-400 font-semibold bg-slate-800/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{role}</span>
                    {currentUser.role === role && <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
