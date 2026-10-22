import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Thermometer,
  Droplets,
  Layers,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, Chamber, InwardEntry } from '../types';

interface ChamberViewProps {
  language: Language;
  chambers: Chamber[];
  inwards: InwardEntry[];
}

interface LotBatchInfo {
  farmerName: string;
  seedVariety: string;
  bags: number;
  receiptNo: string;
  date: string;
  isChamberBulk?: boolean;
}

interface LotCellState {
  stored: number;
  capacity: number;
  batches: LotBatchInfo[];
}

export const ChamberView: React.FC<ChamberViewProps> = ({
  language,
  chambers,
  inwards,
}) => {
  const t = translations[language];

  // Selected floor tab per chamber for inspection (default floor 1)
  const [activeFloors, setActiveFloors] = useState<Record<string, number>>({});

  // Active lot selected for modal detailed inspector
  const [selectedLotDetail, setSelectedLotDetail] = useState<{
    chamberName: string;
    chamberId: string;
    floorNum: number;
    lotNum: number;
    stored: number;
    capacity: number;
    batches: LotBatchInfo[];
  } | null>(null);

  const totalCapacity = chambers.reduce((acc, c) => acc + c.totalCapacity, 0);
  const totalOccupied = chambers.reduce((acc, c) => acc + c.currentBags, 0);
  const totalVacant = Math.max(0, totalCapacity - totalOccupied);
  const overallPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  /**
   * Comprehensive Lot-by-Lot Occupancy Engine
   * Ensures that ALL bags stored in a chamber (whether added lot-wise or chamber-wise)
   * are accurately mapped across the 4 floors and 10 lots per floor (500 bags/lot).
   * No lot will ever show empty if the chamber is filled!
   */
  const chamberGrids = useMemo(() => {
    const result: Record<string, Record<number, Record<number, LotCellState>>> = {};

    for (const chamber of chambers) {
      const flCount = chamber.floorCount || 4;
      const lotsPerFl = chamber.chhattasPerFloor || 10;
      const capPerLot = chamber.capacityPerChhatta || 500;

      // Initialize grid: fl -> lot -> LotCellState
      const grid: Record<number, Record<number, LotCellState>> = {};
      for (let f = 1; f <= flCount; f++) {
        grid[f] = {};
        for (let l = 1; l <= lotsPerFl; l++) {
          grid[f][l] = { stored: 0, capacity: capPerLot, batches: [] };
        }
      }

      // Active inward records for this chamber
      const chamberInwards = inwards.filter(
        (i) => i.chamberId === chamber.id && i.remainingBags > 0
      );

      const floorSpecificWithoutLot: InwardEntry[] = [];
      const chamberWideEntries: InwardEntry[] = [];

      // Pass 1: Allocate explicit lots (entries having explicit floor 1..4 and lot 1..10)
      for (const item of chamberInwards) {
        let flNum: number | null = null;
        if (item.floorNo) {
          const flMatch = item.floorNo.match(/floor\s*(\d+)/i);
          if (flMatch) {
            flNum = parseInt(flMatch[1], 10);
          } else if (/^[1-4]$/.test(item.floorNo.trim())) {
            flNum = parseInt(item.floorNo.trim(), 10);
          }
        }

        let lotNum: number | null = null;
        if (typeof item.lotNo === 'number' && item.lotNo >= 1 && item.lotNo <= lotsPerFl) {
          lotNum = item.lotNo;
        } else if (typeof item.chhattaNo === 'number' && item.chhattaNo >= 1 && item.chhattaNo <= lotsPerFl) {
          lotNum = item.chhattaNo;
        } else if (item.floorNo) {
          const lotMatch = item.floorNo.match(/(?:lot|chhatta)\s*#?\s*(\d+)/i);
          if (lotMatch) {
            lotNum = parseInt(lotMatch[1], 10);
          }
        }

        if (flNum && flNum >= 1 && flNum <= flCount && lotNum && lotNum >= 1 && lotNum <= lotsPerFl) {
          grid[flNum][lotNum].stored += item.remainingBags;
          grid[flNum][lotNum].batches.push({
            farmerName: item.farmerName,
            seedVariety: item.seedVariety,
            bags: item.remainingBags,
            receiptNo: item.receiptNo,
            date: item.date,
          });
        } else if (flNum && flNum >= 1 && flNum <= flCount) {
          floorSpecificWithoutLot.push(item);
        } else {
          chamberWideEntries.push(item);
        }
      }

      // Pass 2: Distribute floor-specific entries without a specific lot number into that floor's available lots
      for (const item of floorSpecificWithoutLot) {
        const flMatch = item.floorNo.match(/floor\s*(\d+)/i);
        const flNum = flMatch ? parseInt(flMatch[1], 10) : parseInt(item.floorNo, 10);
        if (!grid[flNum]) continue;

        let rem = item.remainingBags;
        for (let l = 1; l <= lotsPerFl; l++) {
          if (rem <= 0) break;
          const vacant = Math.max(0, capPerLot - grid[flNum][l].stored);
          if (vacant <= 0) continue;
          const take = Math.min(rem, vacant);
          grid[flNum][l].stored += take;
          grid[flNum][l].batches.push({
            farmerName: item.farmerName,
            seedVariety: item.seedVariety,
            bags: take,
            receiptNo: item.receiptNo,
            date: item.date,
          });
          rem -= take;
        }

        // Spill over if floor capacity exceeded
        if (rem > 0) {
          grid[flNum][lotsPerFl].stored += rem;
          grid[flNum][lotsPerFl].batches.push({
            farmerName: item.farmerName,
            seedVariety: item.seedVariety,
            bags: rem,
            receiptNo: item.receiptNo,
            date: item.date,
          });
        }
      }

      // Pass 3: Distribute chamber-wide entries (added via chamber_auto or bulk) sequentially across the chamber's floors and lots
      for (const item of chamberWideEntries) {
        let rem = item.remainingBags;
        for (let f = 1; f <= flCount; f++) {
          if (rem <= 0) break;
          for (let l = 1; l <= lotsPerFl; l++) {
            if (rem <= 0) break;
            const vacant = Math.max(0, capPerLot - grid[f][l].stored);
            if (vacant <= 0) continue;
            const take = Math.min(rem, vacant);
            grid[f][l].stored += take;
            grid[f][l].batches.push({
              farmerName: item.farmerName,
              seedVariety: item.seedVariety,
              bags: take,
              receiptNo: item.receiptNo,
              date: item.date,
              isChamberBulk: true,
            });
            rem -= take;
          }
        }
        // If still remaining, add to last lot
        if (rem > 0) {
          grid[flCount][lotsPerFl].stored += rem;
          grid[flCount][lotsPerFl].batches.push({
            farmerName: item.farmerName,
            seedVariety: item.seedVariety,
            bags: rem,
            receiptNo: item.receiptNo,
            date: item.date,
            isChamberBulk: true,
          });
        }
      }

      // Pass 4: Sync with chamber.currentBags if chamber has recorded occupancy exceeding inward items
      let totalGridStored = 0;
      for (let f = 1; f <= flCount; f++) {
        for (let l = 1; l <= lotsPerFl; l++) {
          totalGridStored += grid[f][l].stored;
        }
      }

      let extraBags = Math.max(0, chamber.currentBags - totalGridStored);
      if (extraBags > 0) {
        for (let f = 1; f <= flCount; f++) {
          if (extraBags <= 0) break;
          for (let l = 1; l <= lotsPerFl; l++) {
            if (extraBags <= 0) break;
            const vacant = Math.max(0, capPerLot - grid[f][l].stored);
            if (vacant <= 0) continue;
            const take = Math.min(extraBags, vacant);
            grid[f][l].stored += take;
            grid[f][l].batches.push({
              farmerName: language === 'hi' ? 'कोल्ड स्टोरेज स्टॉक' : 'Chamber Stored Stock',
              seedVariety: language === 'hi' ? 'आलू लॉट' : 'Potato Lot',
              bags: take,
              receiptNo: `CH-${chamber.id}`,
              date: new Date().toISOString().split('T')[0],
              isChamberBulk: true,
            });
            extraBags -= take;
          }
        }
      }

      result[chamber.id] = grid;
    }

    return result;
  }, [chambers, inwards, language]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t.chamberStatusTitle}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'hi'
                  ? 'प्रत्येक चेंबर का लाइव स्टॉक, खाली जगह, फ्लोर व लॉट नंबर की लाइव स्थिति'
                  : 'Live chamber occupancy, vacant capacity, floors and lot numbers tracking'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
          <Info className="w-4 h-4 text-amber-700" />
          <span>{language === 'hi' ? 'कुल 4 चेंबर (40 लॉट प्रति चेंबर)' : '4 Chambers (40 Lots/Chamber)'}</span>
        </div>
      </div>

      {/* Overall Storage Capacity Bar */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {language === 'hi' ? 'समस्त कोल्ड स्टोरेज लाइव मीटर' : 'Master Cold Storage Live Meter'}
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              {totalOccupied.toLocaleString('en-IN')} / {totalCapacity.toLocaleString('en-IN')}{' '}
              <span className="text-sm font-normal text-slate-300">
                {language === 'hi' ? 'कट्टे भंडारित' : 'Bags Stored'}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black font-mono text-amber-300">
              {overallPercent}%
            </span>
            <span className="text-xs text-slate-400">
              {language === 'hi' ? 'भरा हुआ' : 'Occupied'}
            </span>
          </div>
        </div>

        {/* Big Meter Bar */}
        <div className="w-full bg-slate-700 rounded-full h-8 p-1.5 border border-slate-600 relative overflow-hidden flex items-center">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              overallPercent > 85 ? 'bg-rose-500' : overallPercent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-700/80 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">{t.totalStorageCapacity}</span>
            <strong className="text-lg font-mono text-white">
              {totalCapacity.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
            </strong>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{t.currentlyFilled}</span>
            <strong className="text-lg font-mono text-amber-400">
              {totalOccupied.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
            </strong>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{t.availableSpace}</span>
            <strong className="text-lg font-mono text-emerald-400">
              {totalVacant.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
            </strong>
          </div>
        </div>
      </div>

      {/* Individual Chambers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {chambers.map((chamber) => {
          const percent = Math.min(100, Math.round((chamber.currentBags / chamber.totalCapacity) * 100));
          const vacant = Math.max(0, chamber.totalCapacity - chamber.currentBags);

          // Get active lots in this chamber
          const chamberLots = inwards.filter(
            (i) => i.chamberId === chamber.id && i.remainingBags > 0
          );

          // Calculate variety distribution in this chamber
          const varietyMap: Record<string, number> = {};
          chamberLots.forEach((l) => {
            varietyMap[l.seedVariety] = (varietyMap[l.seedVariety] || 0) + l.remainingBags;
          });

          const currentFloor = activeFloors[chamber.id] || 1;
          const totalChhattas = chamber.chhattasPerFloor || 10;
          const chhattaCap = chamber.capacityPerChhatta || 500;
          const chamberGrid = chamberGrids[chamber.id] || {};

          // Count filled vs vacant lots across chamber
          let filledLotsCount = 0;
          for (let f = 1; f <= (chamber.floorCount || 4); f++) {
            for (let l = 1; l <= totalChhattas; l++) {
              if (chamberGrid[f] && chamberGrid[f][l] && chamberGrid[f][l].stored > 0) {
                filledLotsCount++;
              }
            }
          }

          return (
            <div
              key={chamber.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-amber-400 transition"
            >
              {/* Chamber Header */}
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {language === 'hi' ? chamber.nameHi : chamber.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {chamber.floorCount} {language === 'hi' ? 'तल / फ्लोर (कुल 40 लॉट)' : 'Floors (40 Lots)'} &bull; {chamber.id}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-slate-900">{percent}%</span>
                    <span className="block text-[10px] text-slate-500 uppercase">{t.occupied}</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      percent > 85 ? 'bg-rose-500 animate-pulse' : percent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Progress Meter */}
              <div className="px-5 pt-5 pb-3">
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percent > 85 ? 'bg-rose-500' : percent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
                    <span className="text-slate-600 block">{t.occupied}:</span>
                    <span className="text-base font-black text-amber-950 font-mono">
                      {chamber.currentBags.toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-normal text-slate-600">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
                    <span className="text-slate-600 block">{t.vacant}:</span>
                    <span className="text-base font-black text-emerald-950 font-mono">
                      {vacant.toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-normal text-slate-600">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
                    </span>
                  </div>
                </div>

                {/* Environmental Controls */}
                <div className="flex items-center justify-around bg-slate-50 rounded-xl p-3 mt-3 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">{t.tempLabel}</span>
                      <strong className="text-slate-900 font-mono text-sm">{chamber.temperature} °C</strong>
                    </div>
                  </div>
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-teal-600" />
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">{t.humidityLabel}</span>
                      <strong className="text-slate-900 font-mono text-sm">{chamber.humidity} %</strong>
                    </div>
                  </div>
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">{t.chamberCapacity}</span>
                      <strong className="text-slate-900 font-mono text-sm">{chamber.totalCapacity.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* Varieties inside this chamber */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                    {language === 'hi' ? 'इस चेंबर में भंडारित किस्में:' : 'Stored Varieties:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(varietyMap).length === 0 ? (
                      <span className="text-xs text-slate-400">
                        {chamber.currentBags > 0
                          ? (language === 'hi' ? `आलू स्टॉक: ${chamber.currentBags} कट्टे` : `Potato Stock: ${chamber.currentBags} bags`)
                          : (language === 'hi' ? 'चेंबर रिक्त है' : 'Chamber is empty')}
                      </span>
                    ) : (
                      Object.entries(varietyMap).map(([varName, count]) => (
                        <span
                          key={varName}
                          className="bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded-md font-semibold border border-slate-200"
                        >
                          {varName}: <strong className="font-mono text-amber-900">{count} {language === 'hi' ? 'कट्टे' : 'Bags'}</strong>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Floor & Lot No. Live Inspector */}
                <div className="mt-4 pt-3 border-t border-slate-200 bg-slate-50/80 -mx-5 -mb-3 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <span>🧱</span> {language === 'hi' ? 'फ्लोर व लॉट नंबर लाइव स्थिति (10 लॉट/फ्लोर)' : 'Floors & Lots Live Status (10 Lots/Floor)'}
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                      {language === 'hi'
                        ? `${filledLotsCount} लॉट भरे हुए • 500 कट्टे/लॉट`
                        : `${filledLotsCount} Lots Stored • 500 Bags/Lot`}
                    </span>
                  </div>

                  {/* Floor Selector Tabs with Floor Totals */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((flNum) => {
                        // Calculate total bags in this floor
                        let flStored = 0;
                        if (chamberGrid[flNum]) {
                          for (let l = 1; l <= totalChhattas; l++) {
                            flStored += chamberGrid[flNum][l]?.stored || 0;
                          }
                        }
                        const isSelected = currentFloor === flNum;

                        return (
                          <button
                            key={flNum}
                            type="button"
                            onClick={() =>
                              setActiveFloors((prev) => ({
                                ...prev,
                                [chamber.id]: flNum,
                              }))
                            }
                            className={`py-1.5 px-1 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                              isSelected
                                ? 'bg-amber-800 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="block font-black">{language === 'hi' ? `फ्लोर ${flNum}` : `Floor ${flNum}`}</span>
                            <span className={`text-[10px] font-mono block ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                              {flStored} <span className="text-[8px]">कट्टे</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 10 Lots Grid for Current Floor */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {Array.from({ length: totalChhattas }, (_, i) => i + 1).map((chNum) => {
                        const cellState = chamberGrid[currentFloor]?.[chNum] || {
                          stored: 0,
                          capacity: chhattaCap,
                          batches: [],
                        };
                        const stored = cellState.stored;
                        const vacant = Math.max(0, chhattaCap - stored);
                        const isFull = vacant <= 0;
                        const fillPct = Math.min(100, Math.round((stored / chhattaCap) * 100));

                        return (
                          <div
                            key={chNum}
                            onClick={() => {
                              setSelectedLotDetail({
                                chamberName: language === 'hi' ? chamber.nameHi : chamber.name,
                                chamberId: chamber.id,
                                floorNum: currentFloor,
                                lotNum: chNum,
                                stored,
                                capacity: chhattaCap,
                                batches: cellState.batches,
                              });
                            }}
                            className={`p-1.5 rounded-lg border text-center flex flex-col justify-between transition cursor-pointer hover:shadow-xs hover:scale-[1.02] ${
                              isFull
                                ? 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-200'
                                : stored > 0
                                ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-200'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                            title={
                              language === 'hi'
                                ? `फ्लोर ${currentFloor}, लॉट #${chNum}: ${stored} कट्टे भरे, ${vacant} खाली (क्लिक कर विवरण देखें)`
                                : `Floor ${currentFloor}, Lot #${chNum}: ${stored} filled, ${vacant} vacant (Click to inspect)`
                            }
                          >
                            <div className="flex items-center justify-between text-[10px] font-black">
                              <span>{language === 'hi' ? `लॉट ${chNum}` : `Lot ${chNum}`}</span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isFull ? 'bg-rose-500' : stored > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                            <div className="text-[10px] font-mono font-bold mt-0.5">
                              {stored > 0 ? (
                                <span className="text-amber-950 font-black">{stored}</span>
                              ) : (
                                <span className="text-emerald-700 font-semibold">{language === 'hi' ? 'खाली' : 'Empty'}</span>
                              )}
                              <span className="text-[8px] text-slate-400">/{chhattaCap}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isFull ? 'bg-rose-500' : fillPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Lot Inspector Modal */}
      {selectedLotDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-800 to-amber-900 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-1.5">
                  <span>🧱</span>
                  <span>{selectedLotDetail.chamberName} &bull; Floor {selectedLotDetail.floorNum} &bull; लॉट #{selectedLotDetail.lotNum}</span>
                </h3>
                <p className="text-xs text-amber-200">
                  {language === 'hi' ? 'लॉट में भंडारित आलू का सम्पूर्ण विवरण' : 'Detailed lot inventory breakdown'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLotDetail(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Capacity Card */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">{language === 'hi' ? 'कुल क्षमता' : 'Capacity'}</span>
                  <span className="text-sm font-black font-mono text-slate-900">{selectedLotDetail.capacity} कट्टे</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 block uppercase font-bold">{language === 'hi' ? 'भंडारित' : 'Stored'}</span>
                  <span className="text-sm font-black font-mono text-amber-950">{selectedLotDetail.stored} कट्टे</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold">{language === 'hi' ? 'खाली जगह' : 'Vacant'}</span>
                  <span className="text-sm font-black font-mono text-emerald-950">
                    {Math.max(0, selectedLotDetail.capacity - selectedLotDetail.stored)} कट्टे
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>{language === 'hi' ? 'भराव प्रतिशत' : 'Occupancy Rate'}</span>
                  <span>{Math.min(100, Math.round((selectedLotDetail.stored / selectedLotDetail.capacity) * 100))}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedLotDetail.stored >= selectedLotDetail.capacity
                        ? 'bg-rose-500'
                        : selectedLotDetail.stored > 0
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((selectedLotDetail.stored / selectedLotDetail.capacity) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Batch Breakdown */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase block mb-2">
                  {language === 'hi' ? 'इस लॉट में भंडारित किसान व आवक पर्ची:' : 'Batches Stored in this Lot:'}
                </span>

                {selectedLotDetail.batches.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    {language === 'hi' ? 'यह लॉट पूर्णतः रिक्त है।' : 'This lot is currently empty.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedLotDetail.batches.map((batch, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-700" />
                            <span>{batch.farmerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-2">
                            <span>🥔 {batch.seedVariety}</span>
                            {batch.receiptNo && (
                              <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-700 font-semibold">
                                {batch.receiptNo}
                              </span>
                            )}
                          </div>
                          {batch.date && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{batch.date}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black font-mono text-amber-950">
                            {batch.bags}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-bold">
                            {language === 'hi' ? 'कट्टे' : 'Bags'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLotDetail(null)}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
