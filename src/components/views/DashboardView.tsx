import React from 'react';
import {
  Users,
  ShieldCheck,
  Send,
  Inbox,
  Clock,
  Ban,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { NavSection } from '../Sidebar';

interface DashboardViewProps {
  analyticsData: any;
  connectionInfo: any;
  pacingConfig: any;
  onNavigate: (section: NavSection) => void;
  onOpenTestInbound: () => void;
  onOpenConsentModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analyticsData,
  connectionInfo,
  pacingConfig,
  onNavigate,
  onOpenTestInbound,
  onOpenConsentModal,
}) => {
  const stats = analyticsData || {};
  const isConnected = connectionInfo?.state === 'CONNECTED';

  const weeklyTrendData = [
    { day: 'Mon', sent: 18, delivered: 18, incoming: 8 },
    { day: 'Tue', sent: 26, delivered: 25, incoming: 12 },
    { day: 'Wed', sent: 22, delivered: 22, incoming: 14 },
    { day: 'Thu', sent: 34, delivered: 33, incoming: 19 },
    { day: 'Fri', sent: 40, delivered: 39, incoming: 22 },
    { day: 'Sat', sent: 30, delivered: 30, incoming: 15 },
    { day: 'Sun', sent: 12, delivered: 12, incoming: 6 },
  ];

  const campaignPerformanceData = [
    { name: 'HP Milcy Turbo', targeted: 5, sent: 3, blocked: 2 },
    { name: 'Racer 4 Coupons', targeted: 8, sent: 6, blocked: 2 },
    { name: 'Maihar Dealers', targeted: 4, sent: 4, blocked: 0 },
    { name: 'Cement Fleets', targeted: 3, sent: 2, blocked: 1 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Demo Mode & Business Banner */}
      <div className="bg-gradient-to-r from-[#0b1329] to-[#1e293b] rounded-xl p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Demo Mode Active
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Vikas Automobiles • Satna, M.P.
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            WhatsApp Business Communication Hub
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Local-first automation suite for HP Lubricants distribution. Connect your WhatsApp Business account via QR code, manage verified customer opt-ins, and broadcast scheme updates without recurring cloud fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('connection')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              isConnected
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{isConnected ? 'WhatsApp Linked' : 'Pair WhatsApp'}</span>
          </button>
          <button
            onClick={onOpenTestInbound}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Simulate Inbound
          </button>
        </div>
      </div>

      {/* Account Info Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <QrCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Connection Status</div>
            <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              {connectionInfo?.linkedNumber || connectionInfo?.state || 'Ready to Pair'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Pacing Mode</div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {pacingConfig?.mode || 'AUTO'} ({pacingConfig?.autoCalculatedInterval || 12}s jitter)
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Account Health</div>
            <div className="text-sm font-bold text-emerald-700 truncate flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal (Green)
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Business Window</div>
            <div className="text-sm font-bold text-slate-900 truncate">
              09:00 AM – 08:00 PM IST
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Consent Statistics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            Customer & Statutory Consent Breakdown
          </h3>
          <button
            onClick={() => onNavigate('consent')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Manage Consent</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Total Contacts</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {stats.totalContacts || 8}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Satna & Rewa CRM</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center justify-between">
              <span>Opted-In</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {stats.optedInCount || 5}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">Eligible for broadcasts</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <div className="text-[11px] font-semibold text-amber-700 flex items-center justify-between">
              <span>Pending Consent</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
              {stats.pendingCount || 1}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5 font-medium">Blocked from queue</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
            <div className="text-[11px] font-semibold text-rose-700 flex items-center justify-between">
              <span>Opted-Out</span>
              <Ban className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
              {stats.optedOutCount || 1}
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5 font-medium">Permanently suppressed</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Contact Groups</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">4</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Retail, Garages, Fleets</div>
          </div>
        </div>
      </div>

      {/* Messaging & Queue Statistics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-4 h-4 text-blue-600" />
            Messaging Operations & Traffic
          </h3>
          <button
            onClick={() => onNavigate('inbox')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Open WhatsApp Inbox</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-500 font-medium">Total Messages</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {stats.totalMessages || 6}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-500 font-medium">Incoming Inbound</div>
            <div className="text-xl font-bold font-mono text-blue-600 mt-0.5">
              {stats.inboundMessages || 3}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-500 font-medium">Outgoing Dispatched</div>
            <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
              {stats.outboundMessages || 3}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-emerald-700 font-medium">Delivered</div>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
              {stats.deliveredMessages || 3}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-blue-700 font-medium">Read Receipts</div>
            <div className="text-xl font-bold font-mono text-blue-600 mt-0.5">
              {stats.readMessages || 2}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-rose-700 font-medium">Blocked / Failed</div>
            <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">0</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-indigo-700 font-medium">Active Queue</div>
            <div className="text-xl font-bold font-mono text-indigo-600 mt-0.5">0</div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Message Traffic */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Weekly Messaging Trends (Satna Warehouse)
              </h4>
              <p className="text-[11px] text-slate-500">
                Dispatches vs Incoming customer inquiries
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Sent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Inbound
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Area type="monotone" dataKey="sent" stroke="#2563eb" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="incoming" stroke="#10b981" fillOpacity={1} fill="url(#colorInbound)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Pre-Flight Screening Comparison */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Campaign Consent Screening Audit
              </h4>
              <p className="text-[11px] text-slate-500">
                Eligible dispatches vs non-consented exclusions
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Sent (Opted In)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Filtered Out
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="sent" fill="#2563eb" radius={[4, 4, 0, 0]} name="Eligible Sent" />
                <Bar dataKey="blocked" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Blocked (No Consent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Launch Bulk Campaign</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Broadcast HP Milcy Turbo or Racer 4 schemes to opted-in mechanics and retailers with pre-send compliance screening.
          </p>
          <button
            onClick={() => onNavigate('campaigns')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Create Campaign</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Register Customer Opt-In</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Record physical counterfoil or digital permission for a Satna workshop or transport fleet with legal audit wording.
          </p>
          <button
            onClick={onOpenConsentModal}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Open Consent Form</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Test Inbound Triggers</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Simulate a customer sending "PRICE", "LOCATION", or "STOP" to verify real-time auto replies and suppression handling.
          </p>
          <button
            onClick={onOpenTestInbound}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Open Inbound Simulator</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
