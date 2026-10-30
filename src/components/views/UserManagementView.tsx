import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  UserCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { api, getActiveUser, setActiveUser } from '../../api';
import { UserProfile, UserRole } from '../../types';

interface UserManagementViewProps {
  onNavigate: (viewId: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ onNavigate }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getActiveUser());

  useEffect(() => {
    loadProfiles();
    const handleUserChange = (e: any) => setCurrentUser(e.detail);
    window.addEventListener('chainpulse:user-changed', handleUserChange);
    return () => window.removeEventListener('chainpulse:user-changed', handleUserChange);
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const handleSwitchActive = (profile: UserProfile) => {
    setActiveUser(profile);
    setCurrentUser(profile);
  };

  const roleDefinitions = [
    {
      role: 'Operations Analyst',
      description: 'Add shipment records, import supply chain data, view disruptions, run ripple impact analysis, calculate order risks.',
      permissions: ['Add Shipments', 'Bulk Import', 'View Disruptions', 'Run Ripple Impact', 'Risk Analysis'],
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      role: 'Supply Chain Manager',
      description: 'Oversee all operations, review recovery recommendations, approve or reject recovery plans, monitor execution progress.',
      permissions: ['All Operations View', 'Review Digital Twin', 'Approve/Reject Plans', 'Monitor Execution'],
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      role: 'Warehouse Operator',
      description: 'Add and update inventory balances, view warehouse capacity, report stock shortages, view approved transfer instructions.',
      permissions: ['Update Inventory', 'View Warehouses', 'Report Shortages', 'Execute Transfers'],
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      role: 'Procurement Approver',
      description: 'Add and update supplier profiles, review alternative supplier options, approve spot market procurement plans.',
      permissions: ['Update Suppliers', 'Review Alt Suppliers', 'Approve Procurement Plans'],
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      role: 'Administrator',
      description: 'Full system management, assign roles, view all records, manage risk scoring weights, view immutable audit logs.',
      permissions: ['User Management', 'Assign Roles', 'Manage Settings', 'Audit Logs Access', 'All Features'],
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Role-Based Access Control (RBAC)</h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                5 Enterprise Roles
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enforced server-side and using Supabase Row Level Security (RLS) policies. Test each identity with instant simulation switching.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Current Active:</span>
            <span className="font-bold text-white">{currentUser.fullName}</span>
            <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/20 px-2 py-0.5 rounded">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Role Definitions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roleDefinitions.map((rd) => (
          <div
            key={rd.role}
            className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between ${
              currentUser.role === rd.role ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${rd.color}`}>
                  {rd.role}
                </span>
                {currentUser.role === rd.role && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active Session
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{rd.description}</p>

              <div className="mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="text-xs truncate">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Assigned User Profile:</span>
                  <span className="font-semibold text-white">
                    {profiles.find((p) => p.role === rd.role)?.fullName || `Active ${rd.role}`}
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('settings')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded transition-colors whitespace-nowrap ml-2"
                >
                  Edit in Settings →
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider mb-1.5">
                  Authorized Permissions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rd.permissions.map((p, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const matched = profiles.find((p) => p.role === rd.role) || {
                    id: `usr_${rd.role.toLowerCase().replace(/[^a-z]/g, '')}`,
                    email: `${rd.role.toLowerCase().replace(/[^a-z]/g, '')}@chainpulse.ai`,
                    fullName: `Active User (${rd.role})`,
                    role: rd.role as UserRole,
                    createdAt: new Date().toISOString(),
                  };
                  handleSwitchActive(matched);
                }}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentUser.role === rd.role
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {currentUser.role === rd.role ? 'Currently Active' : `Switch to ${rd.role}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
