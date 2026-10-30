import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Sparkles,
  Download,
  Calendar,
  TrendingUp,
  RefreshCw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../../api';

interface ReportsAnalyticsViewProps {
  onNavigate: (viewId: string) => void;
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({ onNavigate }) => {
  const [timeframe, setTimeframe] = useState('Current Quarter (Q4 2026)');
  const [executiveReport, setExecutiveReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getDashboardKpis();
      setKpis(data);
    } catch (err) {
      console.error('Failed to load analytics KPIs:', err);
    }
  };

  const handleGenerateExecutiveReport = async () => {
    setLoadingReport(true);
    try {
      const res = await api.generateExecutiveReport(timeframe);
      setExecutiveReport(res.report);
    } catch (err: any) {
      setExecutiveReport(`Failed to generate report: ${err.message}`);
    } finally {
      setLoadingReport(false);
    }
  };

  // Monthly trend demo data
  const monthlyTrends = [
    { month: 'Jun', disruptions: 3, recoveryRate: 94, savings: 18500 },
    { month: 'Jul', disruptions: 5, recoveryRate: 91, savings: 24200 },
    { month: 'Aug', disruptions: 4, recoveryRate: 88, savings: 31000 },
    { month: 'Sep', disruptions: 6, recoveryRate: 95, savings: 42000 },
    { month: 'Oct', disruptions: 2, recoveryRate: 92, savings: 29500 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Executive Reports & Analytics</h1>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                C-Suite Briefing
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supply chain resilience indicators, monthly disruption trends, and autonomous Gemini AI executive briefing generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateExecutiveReport}
              disabled={loadingReport}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span>{loadingReport ? 'Synthesizing with Gemini...' : 'Generate Executive AI Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gemini AI Executive Report Card */}
      {executiveReport && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">
                Executive Supply Chain Resilience Report ({timeframe})
              </h2>
            </div>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
              gemini-3.8-flash Grounded
            </span>
          </div>

          <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-sans">
            {executiveReport}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Disruptions & Mitigations */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Monthly Disruption Incidence</h3>
          <p className="text-xs text-slate-400 mb-4">Frequency of identified logistics anomalies</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="disruptions" fill="#EF4444" name="Disruptions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recovery Cost Savings Trend */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold text-white mb-1">Estimated Cost Savings ($ USD)</h3>
          <p className="text-xs text-slate-400 mb-4">Value preserved via autonomous mitigation</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Cost Saved ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
