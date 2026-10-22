import React, { useState } from 'react';
import { Printer, X, CheckCircle, ArrowDownToDot, ArrowUpFromDot } from 'lucide-react';
import { translations } from '../translations';
import { Language, InwardEntry, OutwardEntry } from '../types';

interface InvoiceModalProps {
  language: Language;
  inwardEntry: InwardEntry | null;
  inwardEntries?: InwardEntry[];
  outwardEntry: OutwardEntry | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  language,
  inwardEntry,
  inwardEntries = [],
  outwardEntry,
  onClose,
}) => {
  const t = translations[language];

  if (!inwardEntry && !outwardEntry) return null;

  const handlePrint = () => {
    window.print();
  };

  const isInward = !!inwardEntry;
  const isOutward = !!outwardEntry;
  const isBatchInward = isInward && inwardEntries.length > 1;
  const hasChhattas = isBatchInward && inwardEntries.some((e) => e.chhattaNo !== undefined);
  const [showDetailedChhattas, setShowDetailedChhattas] = useState(false);

  // Group by Chamber & Floor for clean summary if many chhatta entries
  const floorSummaries = React.useMemo(() => {
    if (!isBatchInward || !hasChhattas) return [];
    const map = new Map<string, {
      chamberName: string;
      floorNo: string;
      chhattaList: number[];
      bagCount: number;
      totalRent: number;
      seedVariety: string;
      weightPerBagKg: number;
      totalWeightKg: number;
    }>();

    inwardEntries.forEach((e) => {
      const key = `${e.chamberName}_${e.floorNo}`;
      const existing = map.get(key);
      if (existing) {
        existing.bagCount += e.bagCount;
        existing.totalRent += e.totalRentAmount;
        existing.totalWeightKg += e.totalWeightKg;
        if (e.chhattaNo && !existing.chhattaList.includes(e.chhattaNo)) {
          existing.chhattaList.push(e.chhattaNo);
        }
      } else {
        map.set(key, {
          chamberName: e.chamberName,
          floorNo: e.floorNo,
          chhattaList: e.chhattaNo ? [e.chhattaNo] : [],
          bagCount: e.bagCount,
          totalRent: e.totalRentAmount,
          seedVariety: e.seedVariety,
          weightPerBagKg: e.weightPerBagKg,
          totalWeightKg: e.totalWeightKg,
        });
      }
    });

    return Array.from(map.values());
  }, [isBatchInward, hasChhattas, inwardEntries]);

  // Batch summary calculations
  const totalBags = isBatchInward
    ? inwardEntries.reduce((acc, e) => acc + e.bagCount, 0)
    : inwardEntry?.bagCount || 0;
  const totalWeightKg = isBatchInward
    ? inwardEntries.reduce((acc, e) => acc + e.totalWeightKg, 0)
    : inwardEntry?.totalWeightKg || 0;
  const totalRent = isBatchInward
    ? inwardEntries.reduce((acc, e) => acc + e.totalRentAmount, 0)
    : inwardEntry?.totalRentAmount || 0;
  const totalAdvance = isBatchInward
    ? inwardEntries.reduce((acc, e) => acc + e.advancePaid, 0)
    : inwardEntry?.advancePaid || 0;
  const totalRemaining = isBatchInward
    ? inwardEntries.reduce((acc, e) => acc + e.remainingRent, 0)
    : inwardEntry?.remainingRent || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            {isInward ? (
              <ArrowDownToDot className="w-5 h-5 text-emerald-400" />
            ) : (
              <ArrowUpFromDot className="w-5 h-5 text-amber-400" />
            )}
            <span className="font-bold text-sm">
              {isInward ? t.inwardInvoiceTitle : t.outwardGatePassTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printBtn}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Voucher Area */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 font-sans print:p-0">
          {/* Header of Cold Storage */}
          <div className="text-center border-b-2 border-slate-800 pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">🥔</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-950">
                {t.appName}
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {t.coldStorageDetails}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {t.phoneHeader}
            </p>

            <div className="mt-3 inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase">
              {isInward
                ? (language === 'hi' ? 'आवक रसीद' : 'INWARD RECEIPT')
                : (language === 'hi' ? 'निकासी गेट पास व बिल' : 'OUTWARD GATE PASS & BILL')}
            </div>
          </div>

          {/* Meta Info Row: Receipt No & Date */}
          <div className="flex justify-between items-center py-3 border-b border-slate-200 text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 font-medium">
                {isInward ? t.receiptNo : t.gatePassNo}:
              </span>{' '}
              <strong className="font-mono font-bold text-slate-900">
                {isInward ? inwardEntry?.receiptNo : outwardEntry?.gatePassNo}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">{t.dateLabel}:</span>{' '}
              <strong className="font-mono font-bold text-slate-900">
                {isInward ? inwardEntry?.date : outwardEntry?.date}
              </strong>
            </div>
          </div>

          {/* Farmer Details Box */}
          <div className="my-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
            <div className="font-bold text-xs uppercase text-amber-900 mb-2 border-b border-slate-200 pb-1">
              {t.farmerDetails}
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-800">
              <div>
                <span className="text-slate-500">{t.farmerName}:</span>{' '}
                <strong className="text-slate-900">
                  {isInward ? inwardEntry?.farmerName : outwardEntry?.farmerName}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">{t.mobileNumber}:</span>{' '}
                <strong className="font-mono">
                  {isInward ? inwardEntry?.farmerPhone : outwardEntry?.farmerPhone}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">{t.village}:</span>{' '}
                <span>
                  {isInward ? inwardEntry?.farmerVillage : outwardEntry?.farmerVillage}
                </span>
              </div>
              <div>
                <span className="text-slate-500">{t.selectChamber}:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {isBatchInward
                    ? hasChhattas
                      ? language === 'hi'
                        ? `⚡ ऑटो लॉट विभाजन (${inwardEntries.length} लॉट • ${new Set(inwardEntries.map(e => e.chamberName)).size} चेंबर)`
                        : `⚡ Auto Lot Division (${inwardEntries.length} Lots • ${new Set(inwardEntries.map(e => e.chamberName)).size} Chambers)`
                      : language === 'hi'
                      ? `⚡ मल्टी-चेंबर ऑटो विभाजन (${inwardEntries.length} चेंबर)`
                      : `⚡ Multi-Chamber Auto Division (${inwardEntries.length} Chambers)`
                    : isInward
                    ? `${inwardEntry?.chamberName} (${inwardEntry?.floorNo}${(inwardEntry?.lotNo || inwardEntry?.chhattaNo) ? (language === 'hi' ? `, लॉट नं. ${inwardEntry.lotNo || inwardEntry.chhattaNo}` : `, Lot #${inwardEntry.lotNo || inwardEntry.chhattaNo}`) : ''})`
                    : `${outwardEntry?.chamberName} (${outwardEntry?.floorNo}${(outwardEntry?.lotNo || outwardEntry?.chhattaNo) ? (language === 'hi' ? `, लॉट नं. ${outwardEntry.lotNo || outwardEntry.chhattaNo}` : `, Lot #${outwardEntry.lotNo || outwardEntry.chhattaNo}`) : ''})`}
                </span>
              </div>
            </div>
          </div>

          {/* Table of Lots & Financials */}
          {isInward && inwardEntry && (
            <div className="space-y-4">
              {hasChhattas && inwardEntries.length > 6 && (
                <div className="flex items-center justify-between bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 text-xs">
                  <span className="font-semibold text-amber-900">
                    {language === 'hi'
                      ? `📦 कुल ${inwardEntries.length} लॉट में ऑटो-विभाजन (${floorSummaries.length} मंजिलों में)`
                      : `📦 Auto-divided across ${inwardEntries.length} lots (${floorSummaries.length} floors)`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDetailedChhattas(!showDetailedChhattas)}
                    className="font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    {showDetailedChhattas
                      ? (language === 'hi' ? '▲ मंजिल सारांश देखें' : '▲ View Floor Summary')
                      : (language === 'hi' ? `▼ प्रत्येक ${inwardEntries.length} लॉट का अलग विवरण देखें` : `▼ Show all ${inwardEntries.length} individual lots`)}
                  </button>
                </div>
              )}

              <table className="w-full text-left border border-slate-300 text-xs sm:text-sm">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5">{t.seedVariety}</th>
                    <th className="p-2.5 text-right">{t.bagCount}</th>
                    <th className="p-2.5 text-right">{t.bagWeightKg}</th>
                    <th className="p-2.5 text-right">{t.totalWeight}</th>
                    <th className="p-2.5 text-right">{t.rentPerBagLabel}</th>
                    <th className="p-2.5 text-right">{t.totalRentGenerated}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isBatchInward ? (
                    <>
                      {hasChhattas && inwardEntries.length > 6 && !showDetailedChhattas ? (
                        // Clean Floor-wise Summary
                        floorSummaries.map((fItem, fIdx) => (
                          <tr key={fIdx} className="bg-slate-50/70 hover:bg-white">
                            <td className="p-2.5 font-bold text-slate-900">
                              {fItem.seedVariety}
                              <span className="block text-[11px] font-semibold text-amber-900 font-mono">
                                📍 {fItem.chamberName} &bull; {fItem.floorNo} ({fItem.chhattaList.length} {language === 'hi' ? 'लॉट: लॉट #' : 'Lots: Lot #'}${Math.min(...fItem.chhattaList)} {language === 'hi' ? 'से' : 'to'} #{Math.max(...fItem.chhattaList)})
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-black font-mono text-amber-950">{fItem.bagCount.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono">{fItem.weightPerBagKg} kg</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {fItem.totalWeightKg.toLocaleString('en-IN')} kg
                            </td>
                            <td className="p-2.5 text-right font-mono">₹160</td>
                            <td className="p-2.5 text-right font-black font-mono text-emerald-900">
                              ₹{fItem.totalRent.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        // Individual rows (Chamber or Lot level)
                        inwardEntries.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="p-2.5 font-bold text-slate-900">
                              {item.seedVariety}
                              <span className="block text-[11px] font-normal text-amber-900 font-mono">
                                📍 {item.chamberName} &bull; {item.floorNo} {(item.lotNo || item.chhattaNo) ? `&bull; ${language === 'hi' ? 'लॉट नं.' : 'Lot #'} ${item.lotNo || item.chhattaNo}` : ''}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-black font-mono text-amber-950">{item.bagCount}</td>
                            <td className="p-2.5 text-right font-mono">{item.weightPerBagKg} kg</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {item.totalWeightKg.toLocaleString('en-IN')} kg
                            </td>
                            <td className="p-2.5 text-right font-mono">₹{item.rentPerBag}</td>
                            <td className="p-2.5 text-right font-black font-mono text-emerald-900">
                              ₹{item.totalRentAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Grand Total Row */}
                      <tr className="bg-amber-100/70 font-black text-slate-900 border-t-2 border-amber-300">
                        <td className="p-2.5 font-black uppercase text-amber-950">
                          {language === 'hi'
                            ? `कुल योग (${hasChhattas ? `${inwardEntries.length} लॉट` : `${inwardEntries.length} चेंबर`} विभाजन)`
                            : `Grand Total (${hasChhattas ? `${inwardEntries.length} lots` : `${inwardEntries.length} chambers`} division)`}
                        </td>
                        <td className="p-2.5 text-right font-mono text-base text-amber-950">
                          {totalBags.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
                        </td>
                        <td className="p-2.5 text-right font-mono">-</td>
                        <td className="p-2.5 text-right font-mono">
                          {totalWeightKg.toLocaleString('en-IN')} kg
                        </td>
                        <td className="p-2.5 text-right font-mono">₹160</td>
                        <td className="p-2.5 text-right font-mono text-base text-emerald-950">
                          ₹{totalRent.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900">{inwardEntry.seedVariety}</td>
                      <td className="p-2.5 text-right font-black font-mono">{inwardEntry.bagCount}</td>
                      <td className="p-2.5 text-right font-mono">{inwardEntry.weightPerBagKg} kg</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {inwardEntry.totalWeightKg.toLocaleString('en-IN')} kg
                      </td>
                      <td className="p-2.5 text-right font-mono">₹{inwardEntry.rentPerBag}</td>
                      <td className="p-2.5 text-right font-black font-mono text-emerald-900">
                        ₹{inwardEntry.totalRentAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Payment Summary Box */}
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <span className="text-slate-600 block">{language === 'hi' ? 'अग्रिम जमा:' : 'Advance Paid:'}</span>
                  <strong className="text-base font-black font-mono text-emerald-800">
                    ₹{totalAdvance.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 block">{language === 'hi' ? 'शेष किराया:' : 'Remaining Rent Due:'}</span>
                  <strong className="text-base font-black font-mono text-rose-800">
                    ₹{totalRemaining.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 block">{language === 'hi' ? 'भुगतान स्थिति:' : 'Payment Status:'}</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-900">
                    {totalRemaining <= 0
                      ? (language === 'hi' ? 'पूर्ण भुगतान' : 'PAID')
                      : totalAdvance > 0
                      ? (language === 'hi' ? 'आंशिक' : 'PARTIAL')
                      : (language === 'hi' ? 'बाकी' : 'UNPAID')}
                  </span>
                </div>
              </div>

              {inwardEntry.vehicleNo && (
                <p className="text-xs text-slate-500 font-mono">
                  {language === 'hi' ? 'गाड़ी नंबर:' : 'Vehicle No:'} <strong>{inwardEntry.vehicleNo}</strong>
                </p>
              )}
            </div>
          )}

          {isOutward && outwardEntry && (
            <div className="space-y-4">
              <table className="w-full text-left border border-slate-300 text-xs sm:text-sm">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5">{t.seedVariety}</th>
                    <th className="p-2.5 text-right">{t.bagsToWithdraw}</th>
                    <th className="p-2.5 text-right">{t.rentPerBagLabel}</th>
                    <th className="p-2.5 text-right">{language === 'hi' ? 'सकल किराया' : 'Gross Rent'}</th>
                    <th className="p-2.5 text-right">{language === 'hi' ? 'अग्रिम कटौती' : 'Advance Adjusted'}</th>
                    <th className="p-2.5 text-right">{language === 'hi' ? 'शुद्ध भुगतान' : 'Net Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900">{outwardEntry.seedVariety}</td>
                    <td className="p-2.5 text-right font-black font-mono text-amber-900">
                      {outwardEntry.bagsOut}
                    </td>
                    <td className="p-2.5 text-right font-mono">₹{outwardEntry.rentPerBag}</td>
                    <td className="p-2.5 text-right font-mono">₹{outwardEntry.grossRentDue}</td>
                    <td className="p-2.5 text-right font-mono text-emerald-700">
                      -₹{outwardEntry.advanceAdjusted}
                    </td>
                    <td className="p-2.5 text-right font-black font-mono text-emerald-900 text-base">
                      ₹{outwardEntry.netAmountPaid.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs sm:text-sm">
                <div>
                  <span className="text-emerald-800 font-medium">
                    {language === 'hi' ? 'भुगतान माध्यम:' : 'Payment Method:'}
                  </span>{' '}
                  <strong className="text-slate-900">{outwardEntry.paymentMethod}</strong>
                  {outwardEntry.paymentRef && (
                    <span className="font-mono text-xs text-slate-500 ml-2">
                      (Ref: {outwardEntry.paymentRef})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-emerald-800 font-medium">
                    {language === 'hi' ? 'प्राप्तकर्ता:' : 'Receiver:'}
                  </span>{' '}
                  <strong className="text-slate-900">
                    {outwardEntry.receiverName || outwardEntry.farmerName}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Terms Note */}
          <p className="mt-6 text-[11px] text-slate-500 text-center italic border-t border-slate-200 pt-3">
            {t.termsNote}
          </p>
        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 cursor-pointer"
          >
            {t.closeBtn}
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.printBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
