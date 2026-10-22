import React, { useState } from 'react';
import {
  ArrowUpFromDot,
  Calculator,
  Calendar,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Printer,
  Sparkles,
  AlertTriangle,
  User,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, Farmer, Chamber, InwardEntry, OutwardEntry } from '../types';
import { getTodayDate } from '../utils/storage';

interface PotatoOutViewProps {
  language: Language;
  farmers: Farmer[];
  chambers: Chamber[];
  inwards: InwardEntry[];
  initialFarmer?: Farmer | null;
  onSaveOutward: (entry: Omit<OutwardEntry, 'id' | 'createdAt'>) => OutwardEntry;
  onOpenGatePassModal: (entry: OutwardEntry) => void;
}

export const PotatoOutView: React.FC<PotatoOutViewProps> = ({
  language,
  farmers,
  chambers,
  inwards,
  initialFarmer,
  onSaveOutward,
  onOpenGatePassModal,
}) => {
  const t = translations[language];

  // Farmer selection
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    initialFarmer?.id || farmers.find((f) => inwards.some((i) => i.farmerId === f.id && i.remainingBags > 0))?.id || (farmers[0]?.id ?? '')
  );

  // Filter inward lots for selected farmer that have remaining bags > 0
  const availableLots = inwards.filter(
    (i) => i.farmerId === selectedFarmerId && i.remainingBags > 0
  );

  const [selectedInwardId, setSelectedInwardId] = useState<string>(availableLots[0]?.id || '');

  // Keep selected lot in sync when farmer changes
  React.useEffect(() => {
    const lots = inwards.filter(
      (i) => i.farmerId === selectedFarmerId && i.remainingBags > 0
    );
    setSelectedInwardId(lots[0]?.id || '');
  }, [selectedFarmerId, inwards]);

  const activeLot = inwards.find((i) => i.id === selectedInwardId);

  // Outward fields
  const [outwardDate, setOutwardDate] = useState<string>(getTodayDate());
  const [bagsToWithdraw, setBagsToWithdraw] = useState<number>(activeLot ? Math.min(50, activeLot.remainingBags) : 50);
  const [handlingFeePerBag, setHandlingFeePerBag] = useState<number>(0); // e.g. ₹0 or ₹5
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Update bags to withdraw default when lot changes
  React.useEffect(() => {
    if (activeLot) {
      setBagsToWithdraw(Math.min(50, activeLot.remainingBags));
    }
  }, [activeLot?.id]);

  // Billing calculations:
  // "farmer ko bss paise dena ha jitna gatta nikal rha ha"
  const rentPerBag = activeLot?.rentPerBag || 160;
  const grossRentDue = (bagsToWithdraw || 0) * rentPerBag;

  // Proportional advance credit adjustment:
  // If farmer paid advance during inward, calculate proportion for this lot's withdrawn bags
  let advanceAdjusted = 0;
  if (activeLot && activeLot.bagCount > 0 && activeLot.advancePaid > 0) {
    const advancePerBag = activeLot.advancePaid / activeLot.bagCount;
    advanceAdjusted = Math.round(advancePerBag * (bagsToWithdraw || 0));
  }

  const totalHandlingFee = (bagsToWithdraw || 0) * (handlingFeePerBag || 0);
  const netAmountToPay = Math.max(0, grossRentDue - advanceAdjusted + totalHandlingFee);

  const [receivedAmount, setReceivedAmount] = useState<number>(netAmountToPay);

  React.useEffect(() => {
    setReceivedAmount(netAmountToPay);
  }, [netAmountToPay]);

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedFarmer) {
      setErrorMsg(language === 'hi' ? 'कृपया किसान चुनें।' : 'Please select farmer.');
      return;
    }
    if (!activeLot) {
      setErrorMsg(
        language === 'hi'
          ? 'इस किसान का कोई सक्रिय आलू स्टॉक उपलब्ध नहीं है।'
          : 'No active potato stock available for this farmer.'
      );
      return;
    }
    if (!bagsToWithdraw || bagsToWithdraw <= 0) {
      setErrorMsg(language === 'hi' ? 'कृपया निकाले जाने वाले कट्टों की संख्या दर्ज करें।' : 'Please enter valid bags count.');
      return;
    }
    if (bagsToWithdraw > activeLot.remainingBags) {
      setErrorMsg(
        language === 'hi'
          ? `निकाले जाने वाले कट्टे उपलब्ध स्टॉक (${activeLot.remainingBags}) से अधिक नहीं हो सकते!`
          : `Cannot withdraw more than available stock (${activeLot.remainingBags})!`
      );
      return;
    }

    const gatePassNo = `GP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const outwardRecord: Omit<OutwardEntry, 'id' | 'createdAt'> = {
      gatePassNo,
      date: outwardDate,
      inwardEntryId: activeLot.id,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      farmerPhone: selectedFarmer.phone,
      farmerVillage: selectedFarmer.village,
      seedVariety: activeLot.seedVariety,
      chamberId: activeLot.chamberId,
      chamberName: activeLot.chamberName,
      floorNo: activeLot.floorNo,
      chhattaNo: activeLot.chhattaNo,
      lotNo: activeLot.lotNo || activeLot.chhattaNo,
      bagsOut: bagsToWithdraw,
      rentPerBag,
      grossRentDue,
      advanceAdjusted,
      handlingFee: totalHandlingFee,
      netAmountPaid: receivedAmount || netAmountToPay,
      paymentMethod,
      paymentRef: paymentRef.trim() || undefined,
      receiverName: receiverName.trim() || selectedFarmer.name,
      vehicleNo: vehicleNo.trim() || undefined,
    };

    const saved = onSaveOutward(outwardRecord);
    setSuccessMsg(t.outwardSuccess);
    onOpenGatePassModal(saved);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center">
              <ArrowUpFromDot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t.potatoOutTitle}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{t.potatoOutSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2 text-xs text-emerald-900 font-semibold flex items-center gap-2">
          <span>✅</span>
          <span>{language === 'hi' ? 'तुरंत गेट पास व बिल जनरेट' : 'Instant Gate Pass & Bill Generation'}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Section 1: Farmer & Lot Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                {t.selectFarmer} *
              </label>
              <select
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.name} ({f.village})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>{language === 'hi' ? 'निकासी की तारीख' : 'Outward Date'} *</span>
              </label>
              <input
                type="date"
                required
                value={outwardDate}
                onChange={(e) => setOutwardDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Section 2: Active Lots for this farmer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              {t.selectBatch} *
            </label>
            {availableLots.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
                {language === 'hi'
                  ? '⚠️ इस किसान के पास वर्तमान में कोई आलू स्टॉक नहीं बचा है।'
                  : '⚠️ No available potato stock found for this farmer in storage.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableLots.map((lot) => {
                  const isSelected = lot.id === selectedInwardId;
                  return (
                    <div
                      key={lot.id}
                      onClick={() => setSelectedInwardId(lot.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-700 bg-amber-50/80 shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{lot.seedVariety}</span>
                        <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                          {language === 'hi' ? 'रसीद:' : 'Receipt:'} {lot.receiptNo}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                        <div>
                          📍 {lot.chamberName} &bull; {lot.floorNo}
                          {(lot.lotNo || lot.chhattaNo) ? `, ${language === 'hi' ? 'लॉट नं.' : 'Lot No.'} ${lot.lotNo || lot.chhattaNo}` : ''}
                        </div>
                        <div>📅 {language === 'hi' ? 'आवक तिथि:' : 'Inward Date:'} {lot.date}</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">{t.availableBagsInBatch}:</span>
                        <span className="text-base font-black text-amber-900 font-mono">
                          {lot.remainingBags} {language === 'hi' ? 'कट्टे' : 'Bags'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Bags to withdraw & Billing Calculation */}
          {activeLot && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>{language === 'hi' ? 'निकाले जाने वाले कट्टे व बिलिंग विवरण' : 'Withdrawal & Billing Details'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Bags to withdraw input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t.bagsToWithdraw} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={activeLot.remainingBags}
                    required
                    value={bagsToWithdraw || ''}
                    onChange={(e) => setBagsToWithdraw(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-lg font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setBagsToWithdraw(Math.min(25, activeLot.remainingBags))}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700"
                    >
                      25
                    </button>
                    <button
                      type="button"
                      onClick={() => setBagsToWithdraw(Math.min(50, activeLot.remainingBags))}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700"
                    >
                      50
                    </button>
                    <button
                      type="button"
                      onClick={() => setBagsToWithdraw(Math.min(100, activeLot.remainingBags))}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700"
                    >
                      100
                    </button>
                    <button
                      type="button"
                      onClick={() => setBagsToWithdraw(activeLot.remainingBags)}
                      className="text-[11px] bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded text-amber-900 font-bold"
                    >
                      {language === 'hi' ? 'सभी कट्टे' : 'All'} ({activeLot.remainingBags})
                    </button>
                  </div>
                </div>

                {/* Optional Palledari / Handling fee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {language === 'hi' ? 'पल्लेदारी/लोडिंग (₹ प्रति कट्टा)' : 'Handling Fee (₹/bag)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={handlingFeePerBag}
                    onChange={(e) => setHandlingFeePerBag(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {language === 'hi' ? 'कुल लोडिंग:' : 'Total Handling:'} ₹{totalHandlingFee}
                  </span>
                </div>

                {/* Net Rent Payable Box */}
                <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-300 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-bold uppercase block">
                      {t.netAmountToPay}
                    </span>
                    <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
                      ₹{netAmountToPay.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-1 space-y-0.5">
                    <div>
                      {language === 'hi' ? 'किराया:' : 'Rent:'} {bagsToWithdraw} &times; ₹{rentPerBag} = ₹{grossRentDue}
                    </div>
                    {advanceAdjusted > 0 && (
                      <div className="text-emerald-700 font-semibold">
                        {language === 'hi' ? '- अग्रिम छूट:' : '- Advance Discount:'} ₹{advanceAdjusted}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method & Collection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t.paymentMethod}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="CASH">{t.cash}</option>
                    <option value="UPI">{t.onlineUpi}</option>
                    <option value="BANK_TRANSFER">{t.bankTransfer}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {language === 'hi' ? 'प्राप्त नकद / राशि (₹)' : 'Amount Received (₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {language === 'hi' ? 'माल लेने वाले का नाम' : 'Receiver / Driver Name'}
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder={selectedFarmer?.name || (language === 'hi' ? 'किसान स्वयं / खरीदार' : 'Farmer self / Buyer')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>
              {language === 'hi'
                ? 'निकासी दर्ज करते ही ऑटोमैटिक निकासी गेट पास व बिल जनरेट होगा।'
                : 'Saving will automatically generate the official Gate Pass & Bill.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={!activeLot || availableLots.length === 0}
            className={`px-6 py-3 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              activeLot && availableLots.length > 0
                ? 'bg-amber-700 hover:bg-amber-800 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{t.saveAndGenerateGatePass}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
