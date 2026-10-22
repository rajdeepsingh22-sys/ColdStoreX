import React, { useState } from 'react';
import {
  FileBarChart2,
  Calendar,
  Download,
  Printer,
  Search,
  ArrowDownToDot,
  ArrowUpFromDot,
  IndianRupee,
  Weight,
  History,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, InwardEntry, OutwardEntry, Farmer, Chamber } from '../types';
import { exportToCSV, getLastMonth8thDate, getTodayDate } from '../utils/storage';

interface ReportsViewProps {
  language: Language;
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  farmers: Farmer[];
  chambers: Chamber[];
  onOpenInwardInvoice: (entry: InwardEntry) => void;
  onOpenOutwardGatePass: (entry: OutwardEntry) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  language,
  inwards,
  outwards,
  farmers,
  chambers,
  onOpenInwardInvoice,
  onOpenOutwardGatePass,
}) => {
  const t = translations[language];

  // Active sub-tab
  const [activeReportTab, setActiveReportTab] = useState<'date' | 'monthly' | 'yearly'>('date');

  // Specific Date State (Defaults to last month's 8th for immediate satisfaction of user query!)
  const [selectedDate, setSelectedDate] = useState<string>(getLastMonth8thDate());

  // Monthly State
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Yearly State
  const [yearlySelectedYear, setYearlySelectedYear] = useState<number>(currentDate.getFullYear() - 1); // Default to last year as per user prompt: "and last year full details"

  // 1. SPECIFIC DATE FILTER LOGIC
  const dateInwards = inwards.filter((i) => i.date === selectedDate);
  const dateOutwards = outwards.filter((o) => o.date === selectedDate);

  const dateTotalInwardBags = dateInwards.reduce((acc, i) => acc + i.bagCount, 0);
  const dateTotalInwardWeightKg = dateInwards.reduce((acc, i) => acc + i.totalWeightKg, 0);
  const dateTotalRentBilled = dateInwards.reduce((acc, i) => acc + i.totalRentAmount, 0);
  const dateTotalOutwardBags = dateOutwards.reduce((acc, o) => acc + o.bagsOut, 0);

  const handleExportDateReport = () => {
    const headers = language === 'hi' ? [
      'प्रकार',
      'पर्ची नं.',
      'तारीख',
      'किसान का नाम',
      'गांव',
      'बीज किस्म',
      'चेंबर',
      'कट्टे',
      'वजन (किग्रा)',
      'किराया (रु.)',
      'भुगतान स्थिति',
    ] : [
      'Type',
      'Slip No',
      'Date',
      'Farmer Name',
      'Village',
      'Seed Variety',
      'Chamber',
      'Bags',
      'Weight (kg)',
      'Rent (INR)',
      'Payment Status',
    ];

    const rows: (string | number)[][] = [
      ...dateInwards.map((i) => [
        language === 'hi' ? 'आवक' : 'INWARD',
        i.receiptNo,
        i.date,
        i.farmerName,
        i.farmerVillage,
        i.seedVariety,
        i.chamberName,
        i.bagCount,
        i.totalWeightKg,
        i.totalRentAmount,
        i.paymentStatus,
      ]),
      ...dateOutwards.map((o) => [
        language === 'hi' ? 'निकासी' : 'OUTWARD',
        o.gatePassNo,
        o.date,
        o.farmerName,
        o.farmerVillage,
        o.seedVariety,
        o.chamberName,
        o.bagsOut,
        '-',
        o.netAmountPaid,
        o.paymentMethod,
      ]),
    ];

    exportToCSV(`Cold_Storage_Report_${selectedDate}`, headers, rows);
  };

  // 2. MONTHLY REPORT LOGIC
  const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
  const monthPrefix = `${selectedYear}-${monthStr}`;

  const monthlyInwards = inwards.filter((i) => i.date.startsWith(monthPrefix));
  const monthlyOutwards = outwards.filter((o) => o.date.startsWith(monthPrefix));

  const monthlyInwardBags = monthlyInwards.reduce((acc, i) => acc + i.bagCount, 0);
  const monthlyInwardWeightKg = monthlyInwards.reduce((acc, i) => acc + i.totalWeightKg, 0);
  const monthlyOutwardBags = monthlyOutwards.reduce((acc, o) => acc + o.bagsOut, 0);
  const monthlyRevenue =
    monthlyInwards.reduce((acc, i) => acc + i.advancePaid, 0) +
    monthlyOutwards.reduce((acc, o) => acc + o.netAmountPaid, 0);
  const monthlyPendingDues = monthlyInwards.reduce((acc, i) => acc + i.remainingRent, 0);

  const handleExportMonthlyReport = () => {
    const headers = [
      'Transaction Type',
      'Slip No',
      'Date',
      'Farmer Name',
      'Phone',
      'Seed Variety',
      'Bags',
      'Amount (INR)',
    ];

    const rows = [
      ...monthlyInwards.map((i) => [
        'INWARD',
        i.receiptNo,
        i.date,
        i.farmerName,
        i.farmerPhone,
        i.seedVariety,
        i.bagCount,
        i.totalRentAmount,
      ]),
      ...monthlyOutwards.map((o) => [
        'OUTWARD',
        o.gatePassNo,
        o.date,
        o.farmerName,
        o.farmerPhone,
        o.seedVariety,
        o.bagsOut,
        o.netAmountPaid,
      ]),
    ];

    exportToCSV(`Monthly_Report_${selectedYear}_${monthStr}`, headers, rows);
  };

  // 3. YEARLY REPORT LOGIC ("and last year full details")
  const yearlyPrefix = `${yearlySelectedYear}-`;
  const yearlyInwards = inwards.filter((i) => i.date.startsWith(yearlyPrefix));
  const yearlyOutwards = outwards.filter((o) => o.date.startsWith(yearlyPrefix));

  const yearlyTotalInwardBags = yearlyInwards.reduce((acc, i) => acc + i.bagCount, 0);
  const yearlyTotalOutwardBags = yearlyOutwards.reduce((acc, o) => acc + o.bagsOut, 0);
  const yearlyTotalRevenue =
    yearlyInwards.reduce((acc, i) => acc + i.advancePaid, 0) +
    yearlyOutwards.reduce((acc, o) => acc + o.netAmountPaid, 0);

  const hindiMonthsShort = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  const englishMonthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Month-by-month breakdown for this year
  const monthsData = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    const prefix = `${yearlySelectedYear}-${mStr}`;
    const inBags = yearlyInwards.filter((i) => i.date.startsWith(prefix)).reduce((a, b) => a + b.bagCount, 0);
    const outBags = yearlyOutwards.filter((o) => o.date.startsWith(prefix)).reduce((a, b) => a + b.bagsOut, 0);
    const rev =
      yearlyInwards.filter((i) => i.date.startsWith(prefix)).reduce((a, b) => a + b.advancePaid, 0) +
      yearlyOutwards.filter((o) => o.date.startsWith(prefix)).reduce((a, b) => a + b.netAmountPaid, 0);
    return {
      monthNumber: m,
      monthName: language === 'hi' ? hindiMonthsShort[idx] : englishMonthsShort[idx],
      inBags,
      outBags,
      revenue: rev,
    };
  });

  const handleExportYearlyReport = () => {
    const headers = language === 'hi'
      ? ['माह', 'आवक कट्टे', 'निकासी कट्टे', 'राजस्व (रु.)']
      : ['Month', 'Inward Bags', 'Outward Bags', 'Revenue (INR)'];
    const rows = monthsData.map((m) => [m.monthName, m.inBags, m.outBags, m.revenue]);
    exportToCSV(`Full_Year_Report_${yearlySelectedYear}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t.reportsTitle}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{t.reportsSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveReportTab('date')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'date'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabSpecificDate}
          </button>
          <button
            onClick={() => setActiveReportTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'monthly'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabMonthlyReport}
          </button>
          <button
            onClick={() => setActiveReportTab('yearly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'yearly'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabYearlyReport}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SPECIFIC DATE INSPECTOR ("last month ki 8 tarik ma kitna potato add hua dekh saka") */}
      {/* ======================================================== */}
      {activeReportTab === 'date' && (
        <div className="space-y-5">
          {/* Date Picker & Quick Selection Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.selectDatePrompt}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    onClick={handleExportDateReport}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t.exportDateReportBtn}</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  {language === 'hi' ? 'त्वरित तारीख चयन (Quick Pick):' : 'Quick Presets:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {/* User query specific button: "last month ki 8 tarik" */}
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getLastMonth8thDate())}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 transition shadow-xs flex items-center gap-1"
                  >
                    <span>⭐</span>
                    <span>{t.btnLastMonth8th} ({getLastMonth8thDate()})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayDate())}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                  >
                    {t.btnToday}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                  >
                    {t.btnYesterday}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Date Summary KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase block">
                {t.bagsAddedOnDate}
              </span>
              <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
                {dateTotalInwardBags.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-emerald-700">
                  {language === 'hi' ? 'कट्टे' : 'Bags'}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700">
                {dateInwards.length} {language === 'hi' ? 'आवक लॉट' : 'lots'}
              </span>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase block">
                {t.weightAddedOnDate}
              </span>
              <div className="text-2xl font-black text-amber-950 font-mono mt-1">
                {dateTotalInwardWeightKg.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-amber-700">kg</span>
              </div>
              <span className="text-[11px] text-amber-800">
                ≈ {(dateTotalInwardWeightKg / 100).toFixed(1)} {language === 'hi' ? 'क्विंटल' : 'Quintals'}
              </span>
            </div>

            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
              <span className="text-xs font-bold text-purple-800 uppercase block">
                {t.rentOnDate}
              </span>
              <div className="text-2xl font-black text-purple-950 font-mono mt-1">
                ₹{dateTotalRentBilled.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-purple-700">
                @ ₹160 / {language === 'hi' ? 'कट्टा' : 'bag'}
              </span>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <span className="text-xs font-bold text-blue-800 uppercase block">
                {t.bagsOutOnDate}
              </span>
              <div className="text-2xl font-black text-blue-950 font-mono mt-1">
                {dateTotalOutwardBags.toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-blue-700">
                  {language === 'hi' ? 'कट्टे' : 'Bags'}
                </span>
              </div>
              <span className="text-[11px] text-blue-700">
                {dateOutwards.length} {language === 'hi' ? 'गेट पास जारी' : 'gate passes'}
              </span>
            </div>
          </div>

          {/* Transactions on this Date Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>
                  {t.transactionsOnDate}: <strong className="font-mono text-amber-900">{selectedDate}</strong>
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                {dateInwards.length + dateOutwards.length} {language === 'hi' ? 'रिकॉर्ड उपलब्ध' : 'records found'}
              </span>
            </div>

            {dateInwards.length === 0 && dateOutwards.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <div className="text-3xl mb-2">📅</div>
                <p>{t.noRecordsOnDate}</p>
                <button
                  onClick={() => setSelectedDate(getLastMonth8thDate())}
                  className="mt-3 text-xs bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200"
                >
                  {language === 'hi' ? 'पिछले माह की 8 तारीख का रिकॉर्ड देखें' : 'View 8th of Last Month Record'}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">{language === 'hi' ? 'प्रकार' : 'Type'}</th>
                      <th className="py-2.5 px-3">{language === 'hi' ? 'पर्ची / रसीद नं.' : 'Slip / Receipt No.'}</th>
                      <th className="py-2.5 px-3">{t.farmerName}</th>
                      <th className="py-2.5 px-3">{t.seedVariety}</th>
                      <th className="py-2.5 px-3">{language === 'hi' ? 'स्थान' : 'Location'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'hi' ? 'कट्टे' : 'Bags'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'hi' ? 'कुल वजन (किग्रा)' : 'Total Wt (kg)'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'hi' ? 'किराया / बिल' : 'Rent / Bill'}</th>
                      <th className="py-2.5 px-3 text-center">{t.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {/* Inward Rows */}
                    {dateInwards.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                            {language === 'hi' ? 'आवक' : 'INWARD'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{i.receiptNo}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{i.farmerName}</td>
                        <td className="py-2.5 px-3 text-amber-900">{i.seedVariety}</td>
                        <td className="py-2.5 px-3 text-slate-600">{i.chamberName} &bull; {i.floorNo}</td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-emerald-800">{i.bagCount}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{i.totalWeightKg.toLocaleString('en-IN')} kg</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{i.totalRentAmount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onOpenInwardInvoice(i)}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold"
                          >
                            {language === 'hi' ? 'पर्ची' : 'Receipt'}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Outward Rows */}
                    {dateOutwards.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 bg-amber-50/20">
                        <td className="py-2.5 px-3">
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                            {language === 'hi' ? 'निकासी' : 'OUTWARD'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{o.gatePassNo}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{o.farmerName}</td>
                        <td className="py-2.5 px-3 text-amber-900">{o.seedVariety}</td>
                        <td className="py-2.5 px-3 text-slate-600">{o.chamberName} &bull; {o.floorNo}</td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-amber-800">{o.bagsOut}</td>
                        <td className="py-2.5 px-3 text-right font-mono">-</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{o.netAmountPaid.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onOpenOutwardGatePass(o)}
                            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded font-bold"
                          >
                            {language === 'hi' ? 'गेट पास' : 'Gate Pass'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MONTHLY REPORT GENERATOR */}
      {/* ======================================================== */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-5">
          {/* Month & Year Selectors */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.selectMonth}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={1}>{language === 'hi' ? 'जनवरी' : 'January'}</option>
                  <option value={2}>{language === 'hi' ? 'फरवरी' : 'February'}</option>
                  <option value={3}>{language === 'hi' ? 'मार्च' : 'March'}</option>
                  <option value={4}>{language === 'hi' ? 'अप्रैल' : 'April'}</option>
                  <option value={5}>{language === 'hi' ? 'मई' : 'May'}</option>
                  <option value={6}>{language === 'hi' ? 'जून' : 'June'}</option>
                  <option value={7}>{language === 'hi' ? 'जुलाई' : 'July'}</option>
                  <option value={8}>{language === 'hi' ? 'अगस्त' : 'August'}</option>
                  <option value={9}>{language === 'hi' ? 'सितंबर' : 'September'}</option>
                  <option value={10}>{language === 'hi' ? 'अक्टूबर' : 'October'}</option>
                  <option value={11}>{language === 'hi' ? 'नवंबर' : 'November'}</option>
                  <option value={12}>{language === 'hi' ? 'दिसंबर' : 'December'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.selectYear}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleExportMonthlyReport}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl border border-slate-300 transition text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{t.exportMonthlyCsv}</span>
            </button>
          </div>

          {/* Monthly KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase block">{t.monthlyInwardBags}</span>
              <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
                {monthlyInwardBags.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-emerald-700">
                {language === 'hi'
                  ? `कुल वजन: ${(monthlyInwardWeightKg / 100).toFixed(0)} क्विंटल`
                  : `Total Wt: ${(monthlyInwardWeightKg / 100).toFixed(0)} Quintals`}
              </span>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase block">{t.monthlyOutwardBags}</span>
              <div className="text-2xl font-black text-amber-950 font-mono mt-1">
                {monthlyOutwardBags.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-amber-700">
                {monthlyOutwards.length} {language === 'hi' ? 'निकासी पर्चियां' : 'gate passes'}
              </span>
            </div>

            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
              <span className="text-xs font-bold text-purple-800 uppercase block">{t.monthlyRevenue}</span>
              <div className="text-2xl font-black text-purple-950 font-mono mt-1">
                ₹{monthlyRevenue.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-purple-700">
                {language === 'hi' ? 'प्राप्त अग्रिम + निकासी भुगतान' : 'Advance + Outward payment'}
              </span>
            </div>

            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 uppercase block">{t.pendingDues}</span>
              <div className="text-2xl font-black text-rose-950 font-mono mt-1">
                ₹{monthlyPendingDues.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-rose-700">
                {language === 'hi' ? 'बाकी वसूली' : 'Pending dues'}
              </span>
            </div>
          </div>

          {/* Monthly Transaction Ledger */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                {language === 'hi'
                  ? `${selectedMonth}/${selectedYear} के समस्त मासिक लेन-देन`
                  : `All Monthly Transactions for ${selectedMonth}/${selectedYear}`}
              </h3>
              <span className="text-xs text-slate-500">
                {language === 'hi'
                  ? `कुल ${monthlyInwards.length + monthlyOutwards.length} लेन-देन`
                  : `Total ${monthlyInwards.length + monthlyOutwards.length} transactions`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{language === 'hi' ? 'तारीख' : 'Date'}</th>
                    <th className="py-2.5 px-3">{language === 'hi' ? 'प्रकार' : 'Type'}</th>
                    <th className="py-2.5 px-3">{language === 'hi' ? 'रसीद नं.' : 'Receipt No.'}</th>
                    <th className="py-2.5 px-3">{t.farmerName}</th>
                    <th className="py-2.5 px-3">{t.seedVariety}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'hi' ? 'कट्टे' : 'Bags'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'hi' ? 'किराया / बिल' : 'Rent / Bill'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'hi' ? 'पर्ची' : 'Receipt'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {monthlyInwards.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono">{i.date}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          {language === 'hi' ? 'आवक' : 'INWARD'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">{i.receiptNo}</td>
                      <td className="py-2.5 px-3 font-bold">{i.farmerName}</td>
                      <td className="py-2.5 px-3">{i.seedVariety}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{i.bagCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">₹{i.totalRentAmount}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenInwardInvoice(i)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-bold"
                        >
                          {language === 'hi' ? 'देखें' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {monthlyOutwards.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 bg-amber-50/20">
                      <td className="py-2.5 px-3 font-mono">{o.date}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          {language === 'hi' ? 'निकासी' : 'OUTWARD'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">{o.gatePassNo}</td>
                      <td className="py-2.5 px-3 font-bold">{o.farmerName}</td>
                      <td className="py-2.5 px-3">{o.seedVariety}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-800">{o.bagsOut}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">₹{o.netAmountPaid}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onOpenOutwardGatePass(o)}
                          className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold"
                        >
                          {language === 'hi' ? 'देखें' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. YEARLY & HISTORICAL REPORT ("and last year full details") */}
      {/* ======================================================== */}
      {activeReportTab === 'yearly' && (
        <div className="space-y-5">
          {/* Year Selector */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {language === 'hi' ? 'विश्लेषण वर्ष चुनें' : 'Select Season / Year'}
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={yearlySelectedYear}
                  onChange={(e) => setYearlySelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={2026}>{language === 'hi' ? 'सीजन 2026 (चालू वर्ष)' : 'Season 2026 (Current)'}</option>
                  <option value={2025}>{language === 'hi' ? 'सीजन 2025 (पिछला वर्ष)' : 'Season 2025 (Last Year)'}</option>
                  <option value={2024}>{language === 'hi' ? 'सीजन 2024 (ऐतिहासिक)' : 'Season 2024 (Historical)'}</option>
                </select>
                <button
                  onClick={() => setYearlySelectedYear(2025)}
                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-2 rounded-xl border border-amber-300 transition"
                >
                  {language === 'hi' ? '⭐ पिछला वर्ष (2025) लोड करें' : '⭐ Load Last Year (2025)'}
                </button>
              </div>
            </div>

            <button
              onClick={handleExportYearlyReport}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl border border-slate-300 transition text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{language === 'hi' ? 'पूर्ण वर्ष का डेटा Export करें' : 'Export Full Year Data (CSV)'}</span>
            </button>
          </div>

          {/* Full Year Summary Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-amber-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>
                {language === 'hi'
                  ? `वर्ष ${yearlySelectedYear} का संपूर्ण वार्षिक विवरण`
                  : `Full Season Overview: Year ${yearlySelectedYear}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4 pt-4 border-t border-slate-700">
              <div>
                <span className="text-xs text-slate-400 block">{t.totalAnnualInward}</span>
                <div className="text-3xl font-black text-white font-mono mt-1">
                  {yearlyTotalInwardBags.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-emerald-400 mt-1 block">
                  {yearlyInwards.length} {language === 'hi' ? 'किसान आवक रिकॉर्ड्स' : 'farmer inward records'}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">{t.totalAnnualOutward}</span>
                <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                  {yearlyTotalOutwardBags.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-amber-300 mt-1 block">
                  {language === 'hi' ? 'कुल निकासी कट्टे' : 'Total Outward Bags'}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">{t.totalAnnualRevenue}</span>
                <div className="text-3xl font-black text-emerald-300 font-mono mt-1">
                  ₹{yearlyTotalRevenue.toLocaleString('en-IN')}
                </div>
                <span className="text-xs text-slate-300 mt-1 block">
                  {language === 'hi' ? 'वार्षिक किराया प्राप्ति' : 'Annual Rent Collection'}
                </span>
              </div>
            </div>
          </div>

          {/* Month-by-month table of that year */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'hi'
                  ? `वर्ष ${yearlySelectedYear} का माहवार विश्लेषण चार्ट व तालिका`
                  : `Month-wise Analysis for Year ${yearlySelectedYear}`}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{language === 'hi' ? 'माह' : 'Month'}</th>
                    <th className="py-3 px-4 text-right">{language === 'hi' ? 'आवक कट्टे' : 'Inward Bags'}</th>
                    <th className="py-3 px-4 text-right">{language === 'hi' ? 'निकासी कट्टे' : 'Outward Bags'}</th>
                    <th className="py-3 px-4 text-right">{language === 'hi' ? 'राजस्व वसूली (₹)' : 'Revenue (₹)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {monthsData.map((m) => (
                    <tr key={m.monthNumber} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{m.monthName}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                        {m.inBags > 0 ? m.inBags.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-800">
                        {m.outBags > 0 ? m.outBags.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {m.revenue > 0 ? `₹${m.revenue.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
