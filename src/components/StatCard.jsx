export default function StatCard({ label, value, sub, icon: Icon, color = '#556B2F', bg = '#F8F7F2' }) {
  return (
    <div className="bg-white rounded-card border border-[#E2E8F0] p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#D4AF37] hover:-translate-y-1 focus-within:ring-2 focus-within:ring-[#556B2F] focus-within:ring-opacity-20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ backgroundColor: bg }}>
            <Icon size={16} style={{ color }} />
          </div>
        )}
      </div>
      <p className="font-mono-nums text-2xl font-bold text-[#1F2937] leading-tight transition-colors duration-200" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#94A3B8]">{sub}</p>}
    </div>
  );
}
