export default function StatCard({ label, value, sub, icon: Icon, color = '#556B2F', bg = '#F8F7F2', trend }) {
  return (
    <div
      className="bg-white rounded-card p-4 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1 cursor-default"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #F0F2F5' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider leading-tight">{label}</span>
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: bg }}
          >
            <Icon size={18} style={{ color }} strokeWidth={2} />
          </div>
        )}
      </div>
      <div>
        <p
          className="font-mono-nums text-[22px] font-bold leading-none stat-value"
          style={{ color }}
        >
          {value}
        </p>
        {sub && <p className="text-[11px] text-[#94A3B8] mt-1">{sub}</p>}
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold" style={{ color: trend > 0 ? '#EF4444' : '#22C55E' }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-[10px] text-[#94A3B8]">vs last week</span>
        </div>
      )}
    </div>
  );
}
