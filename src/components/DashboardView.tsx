import React from 'react';
import {
  Boxes,
  Users,
  ArrowDownToDot,
  ArrowUpFromDot,
  IndianRupee,
  Clock,
  PlusCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  Warehouse,
  Thermometer,
  Droplets,
  Calendar,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, Chamber, Farmer, InwardEntry, OutwardEntry } from '../types';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  language: Language;
  chambers: Chamber[];
  farmers: Farmer[];
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenInwardInvoice: (entry: InwardEntry) => void;
  onOpenOutwardGatePass: (entry: OutwardEntry) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  language,
  chambers,
  farmers,
  inwards,
  outwards,
  setActiveTab,
  onOpenInwardInvoice,
  onOpenOutwardGatePass,
}) => {
  const t = translations[language];

  // Capacity calculations
  const totalCapacity = chambers.reduce((acc, c) => acc + c.totalCapacity, 0);
  const totalStoredBags = chambers.reduce((acc, c) => acc + c.currentBags, 0);
  const totalVacantBags = Math.max(0, totalCapacity - totalStoredBags);
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalStoredBags / totalCapacity) * 100) : 0;

  // Today calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInwardBags = inwards
    .filter((i) => i.date === todayStr)
    .reduce((acc, i) => acc + i.bagCount, 0);
  const todayOutwardBags = outwards
    .filter((o) => o.date === todayStr)
    .reduce((acc, o) => acc + o.bagsOut, 0);

  // Financial calculations
  const totalRentCollected =
    inwards.reduce((acc, i) => acc + i.advancePaid, 0) +
    outwards.reduce((acc, o) => acc + o.netAmountPaid, 0);

  const pendingDues = inwards.reduce((acc, i) => acc + i.remainingRent, 0);

  // Seed variety distribution
  const varietyCounts: Record<string, number> = {};
  inwards.forEach((i) => {
    varietyCounts[i.seedVariety] = (varietyCounts[i.seedVariety] || 0) + i.remainingBags;
  });
  const topVarieties = Object.entries(varietyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner / Header */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-amber-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Warehouse className="w-4 h-4" />
            <span>{t.appName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {language === 'hi' ? 'कोल्ड स्टोरेज मुख्य डैशबोर्ड' : 'Cold Storage Main Dashboard'}
          </h1>
          <p className="text-amber-200 text-sm mt-1">
            {language === 'hi'
              ? 'आलू आवक दर: ₹160/कट्टा (सीजन 2026-27) • सभी चेंबर सुचारू रूप से कार्यरत हैं'
              : 'Potato Inward Rate: ₹160/bag (Season 2026-27) • All chambers operating normally'}
          </p>
        </div>

        {/* Quick Action Buttons on Dashboard */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setActiveTab('farmers')}
            className="flex items-center gap-2 bg-white text-amber-900 font-bold px-4 py-2.5 rounded-xl shadow hover:bg-amber-50 transition text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-700" />
            <span>{t.addNewFarmer}</span>
          </button>
          <button
            onClick={() => setActiveTab('potatoIn')}
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow hover:bg-emerald-700 transition text-sm cursor-pointer"
          >
            <ArrowDownToDot className="w-4 h-4 text-emerald-200" />
            <span>{t.recordPotatoIn}</span>
          </button>
          <button
            onClick={() => setActiveTab('potatoOut')}
            className="flex items-center gap-2 bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl shadow hover:bg-amber-700 transition text-sm cursor-pointer"
          >
            <ArrowUpFromDot className="w-4 h-4 text-amber-200" />
            <span>{t.recordPotatoOut}</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2.5 rounded-xl shadow transition text-sm cursor-pointer"
          >
            <Users className="w-4 h-4 text-purple-200" />
            <span>{language === 'hi' ? 'मित्रों को एक्सेस दें' : 'Friends Access'}</span>
          </button>
        </div>
      </div>

      {/* Live Total Storage Capacity Meter ("sath hi total storage capacity ka live dashboard bhi ho") */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-700" />
              <h2 className="text-lg font-black text-slate-900">{t.totalStorageCapacity}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'hi'
                ? 'लाइव चेंबर भंडारण मीटर - कितना स्टोर भर गया और कितना खाली है'
                : 'Live Chamber Storage Meter - Check occupied and vacant capacity'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-600"></span>
              <span className="text-slate-600 font-medium">{t.currentlyFilled}:</span>
              <strong className="text-slate-900 font-bold">{totalStoredBags.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">{t.availableSpace}:</span>
              <strong className="text-emerald-700 font-bold">{totalVacantBags.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Live Visual Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-7 p-1 border border-slate-200 relative overflow-hidden flex items-center shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-3 text-xs font-black text-white ${
              occupancyPercent > 85 ? 'bg-rose-600' : occupancyPercent > 65 ? 'bg-amber-600' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.max(8, occupancyPercent)}%` }}
          >
            <span>{occupancyPercent}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-xs text-amber-800 font-semibold block">{t.totalStorageCapacity}</span>
            <span className="text-xl font-black text-amber-950 font-mono">
              {totalCapacity.toLocaleString('en-IN')} <span className="text-xs font-normal">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
            </span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-xs text-blue-800 font-semibold block">{t.currentlyFilled}</span>
            <span className="text-xl font-black text-blue-950 font-mono">
              {totalStoredBags.toLocaleString('en-IN')} <span className="text-xs font-normal">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-800 font-semibold block">{t.availableSpace}</span>
            <span className="text-xl font-black text-emerald-950 font-mono">
              {totalVacantBags.toLocaleString('en-IN')} <span className="text-xs font-normal">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
            </span>
          </div>
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
            <span className="text-xs text-purple-800 font-semibold block">{t.percentOccupied}</span>
            <span className="text-xl font-black text-purple-950 font-mono">
              {occupancyPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Registered Farmers */}
        <div
          onClick={() => setActiveTab('farmers')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.totalFarmers}</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{farmers.length}</div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <span>{language === 'hi' ? 'सूची देखें' : 'View List'}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Inward */}
        <div
          onClick={() => setActiveTab('potatoIn')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.todayInwardBags}</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{todayInwardBags.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <span>{language === 'hi' ? 'आवक दर्ज करें' : 'Record Inward'}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center">
            <ArrowDownToDot className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Outward */}
        <div
          onClick={() => setActiveTab('potatoOut')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.todayOutwardBags}</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{todayOutwardBags.toLocaleString('en-IN')}</div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <span>{language === 'hi' ? 'निकासी बिलिंग' : 'Record Outward'}</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center">
            <ArrowUpFromDot className="w-6 h-6" />
          </div>
        </div>

        {/* Total Rent Revenue */}
        <div
          onClick={() => setActiveTab('reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.seasonRevenue}</span>
            <div className="text-2xl font-black text-purple-900 mt-1">
              ₹{totalRentCollected.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
              <span>{language === 'hi' ? 'बकाया: ₹' + pendingDues.toLocaleString('en-IN') : 'Dues: ₹' + pendingDues.toLocaleString('en-IN')}</span>
            </span>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-800 rounded-2xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Chamber-wise Quick Cards ("fir hum dekh saka ki kitna store bhar gya kitna khali ha chamber sa ke hisaab se") */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-black text-slate-900">{t.liveChamberStatus}</h2>
          </div>
          <button
            onClick={() => setActiveTab('chambers')}
            className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
          >
            <span>{language === 'hi' ? 'विस्तार से देखें' : 'View Full Details'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {chambers.map((ch) => {
            const chPercent = Math.min(100, Math.round((ch.currentBags / ch.totalCapacity) * 100));
            const vacant = ch.totalCapacity - ch.currentBags;
            return (
              <div
                key={ch.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {language === 'hi' ? ch.nameHi : ch.name}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-black ${
                      chPercent > 85 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {chPercent}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3 mb-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      chPercent > 85 ? 'bg-rose-500' : chPercent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${chPercent}%` }}
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{t.occupied}:</span>
                    <strong className="text-slate-900">{ch.currentBags.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.vacant}:</span>
                    <strong className="text-emerald-700">{vacant.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}</strong>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                      <span>{ch.temperature}°C</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-teal-600" />
                      <span>{ch.humidity}%</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Chart & Popular Seed Variety Row ("analytics chart dikhe") */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seed Varieties in Cold Storage */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-slate-900 text-base">
              {language === 'hi' ? 'भंडारित बीज की प्रमुख किस्में' : 'Top Stored Potato Varieties'}
            </h3>
          </div>
          <div className="space-y-3 mt-3">
            {topVarieties.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {language === 'hi' ? 'वर्तमान में कोई आलू भंडारित नहीं है।' : 'No potatoes currently in storage.'}
              </p>
            ) : (
              topVarieties.map(([variety, count]) => {
                const share = totalStoredBags > 0 ? Math.round((count / totalStoredBags) * 100) : 0;
                return (
                  <div key={variety} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{variety}</span>
                      <span className="text-amber-800 font-mono">
                        {count.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'} ({share}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-amber-700 h-2 rounded-full"
                        style={{ width: `${Math.min(100, share)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Inwards Table (with instant invoice button) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowDownToDot className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">{t.recentInwardActivity}</h3>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              <span>{language === 'hi' ? 'तारीख अनुसार रिपोर्ट' : 'Datewise Report'}</span>
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">{t.inwardDate}</th>
                  <th className="py-2.5 px-3">{t.farmerName}</th>
                  <th className="py-2.5 px-3">{t.seedVariety}</th>
                  <th className="py-2.5 px-3 text-right">{t.bagCount}</th>
                  <th className="py-2.5 px-3 text-right">{t.totalRentGenerated}</th>
                  <th className="py-2.5 px-3 text-center">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {inwards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {language === 'hi'
                        ? 'अभी तक कोई आवक दर्ज नहीं हुई है। "आलू आवक दर्ज करें" बटन से एंट्री करें।'
                        : 'No inward entries yet. Click "Record Potato Inward" to add.'}
                    </td>
                  </tr>
                ) : (
                  inwards.slice(0, 5).map((inw) => (
                    <tr key={inw.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono text-slate-600">{inw.date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{inw.farmerName}</td>
                      <td className="py-2.5 px-3 text-amber-900">{inw.seedVariety}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">
                        {inw.bagCount} <span className="text-[10px] text-slate-400">({inw.weightPerBagKg}kg)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800 font-mono">
                        ₹{inw.totalRentAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenInwardInvoice(inw)}
                          className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                          title={language === 'hi' ? 'आवक रसीद देखें' : 'View Inward Receipt'}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{language === 'hi' ? 'पर्ची' : 'Receipt'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
