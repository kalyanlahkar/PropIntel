import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  PlusCircle, 
  Camera, 
  Bot, 
  AlertTriangle,
  FileCheck,
  TrendingUp
} from 'lucide-react';
import { PropertyRecord } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'add' | 'capture' | 'detail' | 'chat' | 'cashflow';
  setActiveTab: (tab: 'dashboard' | 'add' | 'capture' | 'detail' | 'chat' | 'cashflow') => void;
  properties: PropertyRecord[];
  onOpenAlertsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  properties,
  onOpenAlertsModal
}) => {
  // Calculate upcoming expiring lease or document validity (< 60 days)
  const alertCount = properties.filter(p => {
    const rawExpiry = p.leaseValidUpto;
    if (!rawExpiry || rawExpiry === '---') return false;
    const days = Math.ceil((new Date(rawExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return !isNaN(days) && days <= 60;
  }).length;

  return (
    <header className="bg-[#0d0f14]/90 border-b border-slate-800 text-slate-300 sticky top-0 z-40 backdrop-blur-md shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand / Logo */}
          <div 
            className="flex items-center space-x-3.5 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:bg-indigo-500 transition-all">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">PropIntel</span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  AI Platform
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Property Document Intelligence &amp; Compliance
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#1a1d23]/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'add'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Property</span>
            </button>

            <button
              onClick={() => setActiveTab('cashflow')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cashflow'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>FY Cashflow</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>
          </nav>

          {/* Right Controls: Expiry Alerts */}
          <div className="flex items-center space-x-3">
            {/* Compliance Alerts Trigger */}
            <button
              onClick={onOpenAlertsModal}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                alertCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
              title="View Expiring Compliance Alerts"
            >
              {alertCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>{alertCount} Expiry Alert{alertCount > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Compliant</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-1.5 rounded ${
              activeTab === 'dashboard' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex flex-col items-center p-1.5 rounded ${
              activeTab === 'cashflow' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Cashflow</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex flex-col items-center p-1.5 rounded ${
              activeTab === 'add' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Prop</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center p-1.5 rounded ${
              activeTab === 'chat' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
};
