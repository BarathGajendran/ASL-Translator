import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { BarChart3, Activity, Award, TrendingUp, Trash2 } from 'lucide-react';

const AnalyticsPanel = ({ analytics }) => {
  const { totalGestures, averageAccuracy, mostUsed, confidenceDistribution } = analytics;

  // Format real database statistics
  const chartDataMostUsed = mostUsed && mostUsed.length > 0 
    ? mostUsed.map(item => ({ name: item.gesture.toUpperCase(), count: item.count }))
    : [];

  const chartDataConfidence = confidenceDistribution && confidenceDistribution.length > 0
    ? confidenceDistribution.map(item => ({ bin: `${item.bin}%`, count: item.count }))
    : [];

  // Parse stats safely, default to 0
  const gesturesCount = typeof totalGestures === 'number' ? totalGestures : 0;
  const accuracyVal = typeof averageAccuracy === 'number' ? averageAccuracy : 0.0;

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-card border border-dark-border px-3 py-2 rounded-lg shadow-glass text-xs">
          <p className="font-semibold text-gray-200">{label}</p>
          <p className="text-primary-light">Count: <span className="text-white font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to reset all your analytics data back to zero? This will permanently delete your session history.")) return;
    try {
      const res = await fetch('/api/analytics/clear', { method: 'POST' });
      if (res.ok) {
        window.location.reload(); // Refresh the page to reload a completely fresh session from 0
      }
    } catch (err) {
      console.error("Error resetting statistics:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* KPI Stats Column */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        
        {/* Total Gestures Metric */}
        <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card/30 p-5 shadow-glass flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary-light border border-primary/20">
            <Activity className="h-6 w-6" />
          </div>
          <div className="z-10">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Total Gestures</span>
            <span className="text-3xl font-extrabold text-white tracking-tight">{gesturesCount}</span>
            <span className="text-xs text-emerald-400 flex items-center gap-0.5 mt-0.5 font-medium">
              <TrendingUp className="h-3 w-3" />
              Real-time tracker
            </span>
          </div>
          {/* Decorative back-grid */}
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-primary pointer-events-none transform translate-x-2 translate-y-4 font-bold text-7xl select-none">
            #
          </div>
        </div>

        {/* Detection Accuracy Metric */}
        <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card/30 p-5 shadow-glass flex items-center gap-4">
          <div className="rounded-xl bg-accent/10 p-3 text-accent border border-accent/20">
            <Award className="h-6 w-6" />
          </div>
          <div className="z-10">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Average Accuracy</span>
            <span className="text-3xl font-extrabold text-white tracking-tight">{accuracyVal}%</span>
            <span className="text-xs text-gray-400 block mt-0.5">CNN confidence output</span>
          </div>
          {/* Decorative back-grid */}
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-accent pointer-events-none transform translate-x-2 translate-y-4 font-bold text-7xl select-none">
            %
          </div>
        </div>

        {/* Reset Database Button */}
        <button
          onClick={handleClearData}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 py-3 font-semibold transition-all duration-200"
          title="Reset database history to 0"
        >
          <Trash2 className="h-4 w-4" />
          Reset All Statistics
        </button>

      </div>

      {/* Recharts Column 1: Most Used Gestures */}
      <div className="lg:col-span-1 rounded-2xl border border-dark-border bg-dark-card/30 p-5 shadow-glass flex flex-col justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-gray-300 flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          Most-Used Gestures
        </h3>
        
        <div className="h-48 w-full flex items-center justify-center">
          {chartDataMostUsed.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataMostUsed} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-dark-border/40 rounded-xl bg-black/10">
              <span className="text-xs text-gray-500 italic">No gestures registered yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Column 2: Confidence Area Chart */}
      <div className="lg:col-span-1 rounded-2xl border border-dark-border bg-dark-card/30 p-5 shadow-glass flex flex-col justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-gray-300 flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-accent" />
          Confidence Distribution
        </h3>

        <div className="h-48 w-full flex items-center justify-center">
          {chartDataConfidence.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataConfidence} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="bin" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8B5CF6" 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-dark-border/40 rounded-xl bg-black/10">
              <span className="text-xs text-gray-500 italic">No confidence levels logged yet</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AnalyticsPanel;
