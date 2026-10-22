import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Download,
  Phone,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  X,
  ArrowDownToDot,
  ArrowUpFromDot,
  History,
  FolderOpen,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, Farmer, InwardEntry, OutwardEntry } from '../types';
import { exportToCSV } from '../utils/storage';

interface FarmerManagerProps {
  language: Language;
  farmers: Farmer[];
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  onAddFarmer: (newFarmer: Omit<Farmer, 'id' | 'createdAt'>) => void;
  onSelectFarmerForInward: (farmer: Farmer) => void;
  onSelectFarmerForOutward: (farmer: Farmer) => void;
}

export const FarmerManager: React.FC<FarmerManagerProps> = ({
  language,
  farmers,
  inwards,
  outwards,
  onAddFarmer,
  onSelectFarmerForInward,
  onSelectFarmerForOutward,
}) => {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFarmerForPassbook, setSelectedFarmerForPassbook] = useState<Farmer | null>(null);

  // Form fields for adding a new farmer
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [aadharNo, setAadharNo] = useState('');
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Search filter
  const filteredFarmers = farmers.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      f.name.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.phone.includes(q) ||
      f.code.toLowerCase().includes(q)
    );
  });

  // Calculate current stock & dues for each farmer
  const getFarmerStats = (farmerId: string) => {
    const farmerInwards = inwards.filter((i) => i.farmerId === farmerId);
    const farmerOutwards = outwards.filter((o) => o.farmerId === farmerId);

    const totalInwardBags = farmerInwards.reduce((acc, i) => acc + i.bagCount, 0);
    const currentStockBags = farmerInwards.reduce((acc, i) => acc + i.remainingBags, 0);
    const totalOutwardBags = farmerOutwards.reduce((acc, o) => acc + o.bagsOut, 0);
    const pendingRent = farmerInwards.reduce((acc, i) => acc + i.remainingRent, 0);

    return { totalInwardBags, currentStockBags, totalOutwardBags, pendingRent };
  };

  const handleCreateFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError(language === 'hi' ? 'कृपया किसान का नाम दर्ज करें।' : 'Please enter farmer name.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setFormError(language === 'hi' ? 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter valid 10-digit mobile number.');
      return;
    }
    if (!village.trim()) {
      setFormError(language === 'hi' ? 'कृपया गांव का नाम दर्ज करें।' : 'Please enter village name.');
      return;
    }

    const nextCode = `KSN-${100 + farmers.length + 1}`;
    onAddFarmer({
      code: nextCode,
      name: name.trim(),
      fatherName: fatherName.trim() || undefined,
      phone: phone.trim(),
      village: village.trim(),
      aadharNo: aadharNo.trim() || undefined,
    });

    setSuccessToast(t.farmerAddedSuccess);
    setIsAddModalOpen(false);
    setName('');
    setFatherName('');
    setPhone('');
    setVillage('');
    setAadharNo('');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // CSV Export feature: "sath hi export data ka button bhi shamil hona chahiye"
  const handleExportCsv = () => {
    const headers = [
      'Farmer Code',
      'Farmer Name',
      'Father Name',
      'Mobile Number',
      'Village',
      'Aadhaar / ID',
      'Current Stock Bags',
      'Total Inward Bags',
      'Total Outward Bags',
      'Pending Rent (INR)',
      'Registration Date'
    ];

    const rows = farmers.map((f) => {
      const stats = getFarmerStats(f.id);
      return [
        f.code,
        f.name,
        f.fatherName || '-',
        f.phone,
        f.village,
        f.aadharNo || '-',
        stats.currentStockBags,
        stats.totalInwardBags,
        stats.totalOutwardBags,
        stats.pendingRent,
        f.createdAt
      ];
    });

    exportToCSV(`Kisan_Farmers_List_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Row */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-700" />
            <h1 className="text-2xl font-black text-slate-900">{t.farmersDirectory}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'किसान पंजीकरण, वर्तमान स्टॉक विवरण, बही-खाता और एक्सेल/CSV एक्सपोर्ट'
              : 'Farmer registration, live bag balance, passbook and CSV export'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Data Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition text-sm cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>{t.exportFarmersBtn}</span>
          </button>

          {/* Add Farmer Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2.5 rounded-xl shadow transition text-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-200" />
            <span>{t.addNewFarmer}</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
        <div className="text-slate-400 pl-1">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchFarmerPlaceholder}
          className="w-full text-slate-900 text-sm font-medium focus:outline-none bg-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md hover:bg-slate-200"
          >
            {language === 'hi' ? 'हटाएं' : 'Clear'}
          </button>
        )}
      </div>

      {/* Farmers Table / List Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t.kisanCode}</th>
                <th className="py-3 px-4">{t.farmerName}</th>
                <th className="py-3 px-4">{t.village}</th>
                <th className="py-3 px-4">{t.mobileNumber}</th>
                <th className="py-3 px-4 text-right">{t.currentStock}</th>
                <th className="py-3 px-4 text-right">{t.balanceDue}</th>
                <th className="py-3 px-4 text-center">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredFarmers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {t.noFarmersFound}
                  </td>
                </tr>
              ) : (
                filteredFarmers.map((farmer) => {
                  const stats = getFarmerStats(farmer.id);
                  return (
                    <tr key={farmer.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-amber-900">
                        {farmer.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{farmer.name}</div>
                        {farmer.fatherName && (
                          <div className="text-[11px] text-slate-500">
                            {language === 'hi' ? 'पिता:' : 'S/o:'} {farmer.fatherName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{farmer.village}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-mono text-slate-800">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{farmer.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full font-bold font-mono text-xs ${
                          stats.currentStockBags > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {stats.currentStockBags.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {stats.pendingRent > 0 ? (
                          <span className="text-rose-700">₹{stats.pendingRent.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-700">{language === 'hi' ? 'शून्य' : 'Nil'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Quick Inward */}
                          <button
                            onClick={() => onSelectFarmerForInward(farmer)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-xs transition flex items-center gap-1 cursor-pointer"
                            title={t.recordPotatoIn}
                          >
                            <ArrowDownToDot className="w-3 h-3" />
                            <span>{language === 'hi' ? 'आवक' : 'In'}</span>
                          </button>

                          {/* Quick Outward */}
                          <button
                            onClick={() => onSelectFarmerForOutward(farmer)}
                            disabled={stats.currentStockBags <= 0}
                            className={`font-bold px-2 py-1 rounded text-xs transition flex items-center gap-1 ${
                              stats.currentStockBags > 0
                                ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                            title={t.recordPotatoOut}
                          >
                            <ArrowUpFromDot className="w-3 h-3" />
                            <span>{language === 'hi' ? 'निकासी' : 'Out'}</span>
                          </button>

                          {/* Passbook / Ledger */}
                          <button
                            onClick={() => setSelectedFarmerForPassbook(farmer)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded text-xs transition flex items-center gap-1 cursor-pointer"
                            title={t.viewHistory}
                          >
                            <History className="w-3 h-3" />
                            <span>{t.viewHistory}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Farmer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-lg">{t.addNewFarmer}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFarmer} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.farmerName} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'hi' ? 'उदा. रमेश कुमार' : 'e.g. Ramesh Kumar'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.fatherName}
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder={language === 'hi' ? 'उदा. श्री बाबूलाल' : 'e.g. Shri Babulal'}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t.mobileNumber} *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={language === 'hi' ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t.village} *
                  </label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder={language === 'hi' ? 'उदा. सलेमपुर, सादाबाद' : 'e.g. Salempur, Sadabad'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {language === 'hi' ? 'आधार कार्ड / पहचान पत्र (वैकल्पिक)' : 'Aadhaar Card / ID (Optional)'}
                </label>
                <input
                  type="text"
                  value={aadharNo}
                  onChange={(e) => setAadharNo(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-100"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-sm shadow cursor-pointer"
                >
                  {t.saveFarmer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Farmer Passbook Drawer / Modal */}
      {selectedFarmerForPassbook && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <span>
                    {language === 'hi'
                      ? `किसान खाता बही: ${selectedFarmerForPassbook.name}`
                      : `Farmer Passbook: ${selectedFarmerForPassbook.name}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedFarmerForPassbook.code} &bull; {selectedFarmerForPassbook.village} &bull; {selectedFarmerForPassbook.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedFarmerForPassbook(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Summary Bar */}
              {(() => {
                const s = getFarmerStats(selectedFarmerForPassbook.id);
                return (
                  <div className="grid grid-cols-3 gap-3 bg-amber-50 p-3 rounded-xl border border-amber-200 text-center text-xs">
                    <div>
                      <span className="text-slate-600 block">{t.totalInwardStored}</span>
                      <strong className="text-base text-slate-900 font-mono">{s.totalInwardBags}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">{t.currentStock}</span>
                      <strong className="text-base text-amber-800 font-mono">{s.currentStockBags}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">{t.balanceDue}</span>
                      <strong className="text-base text-rose-700 font-mono">₹{s.pendingRent.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                );
              })()}

              <h4 className="font-bold text-sm text-slate-900 border-b pb-1">
                {language === 'hi' ? 'आवक इतिहास' : 'Inward Lots History'}
              </h4>
              <div className="space-y-2">
                {inwards
                  .filter((i) => i.farmerId === selectedFarmerForPassbook.id)
                  .map((i) => (
                    <div key={i.id} className="p-3 border rounded-xl text-xs flex justify-between items-center bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{i.seedVariety} &bull; {i.chamberName} ({i.floorNo})</div>
                        <div className="text-slate-500 font-mono">
                          {language === 'hi' ? `रसीद: ${i.receiptNo} • तारीख: ${i.date}` : `Receipt: ${i.receiptNo} • Date: ${i.date}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          {i.bagCount} {language === 'hi' ? 'कट्टे' : 'Bags'} ({i.weightPerBagKg} kg)
                        </div>
                        <div className="text-emerald-700 font-bold font-mono">
                          {language === 'hi'
                            ? `किराया: ₹${i.totalRentAmount} (जमा: ₹${i.advancePaid})`
                            : `Rent: ₹${i.totalRentAmount} (Adv: ₹${i.advancePaid})`}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <h4 className="font-bold text-sm text-slate-900 border-b pb-1 pt-2">
                {language === 'hi' ? 'निकासी इतिहास' : 'Outward Dispatches History'}
              </h4>
              <div className="space-y-2">
                {outwards.filter((o) => o.farmerId === selectedFarmerForPassbook.id).length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {language === 'hi' ? 'अभी तक कोई निकासी नहीं हुई है।' : 'No outward dispatches recorded yet.'}
                  </p>
                ) : (
                  outwards
                    .filter((o) => o.farmerId === selectedFarmerForPassbook.id)
                    .map((o) => (
                      <div key={o.id} className="p-3 border rounded-xl text-xs flex justify-between items-center bg-amber-50/50">
                        <div>
                          <div className="font-bold text-slate-900">
                            {language === 'hi' ? `गेट पास: ${o.gatePassNo} • ${o.seedVariety}` : `Gate Pass: ${o.gatePassNo} • ${o.seedVariety}`}
                          </div>
                          <div className="text-slate-500 font-mono">
                            {language === 'hi' ? `तारीख: ${o.date} • ${o.chamberName}` : `Date: ${o.date} • ${o.chamberName}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-900">
                            {o.bagsOut} {language === 'hi' ? 'कट्टे निकले' : 'Bags Out'}
                          </div>
                          <div className="text-emerald-700 font-bold font-mono">
                            {language === 'hi' ? `भुगतान: ₹${o.netAmountPaid} (${o.paymentMethod})` : `Paid: ₹${o.netAmountPaid} (${o.paymentMethod})`}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button
                onClick={() => setSelectedFarmerForPassbook(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
