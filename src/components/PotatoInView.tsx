import React, { useState } from 'react';
import {
  ArrowDownToDot,
  Calculator,
  Calendar,
  Warehouse,
  IndianRupee,
  Truck,
  CheckCircle2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { translations } from '../translations';
import { Language, Farmer, Chamber, InwardEntry } from '../types';
import { getTodayDate } from '../utils/storage';

interface PotatoInViewProps {
  language: Language;
  farmers: Farmer[];
  chambers: Chamber[];
  inwards?: InwardEntry[];
  initialFarmer?: Farmer | null;
  onSaveInward: (entry: Omit<InwardEntry, 'id' | 'createdAt'>) => InwardEntry;
  onSaveInwardBatch?: (entries: Omit<InwardEntry, 'id' | 'createdAt'>[]) => InwardEntry[];
  onOpenInvoiceModal: (entry: InwardEntry, batch?: InwardEntry[]) => void;
}

const COMMON_VARIETIES_HI = [
  'कुफरी पुखराज',
  'कुफरी ज्योति',
  'चिप्सोना-1',
  'चिप्सोना-3',
  '3797 आलू',
  'कुफरी मोहन',
  'एल.आर. लाल आलू',
  'लौवकार',
  'कुफरी बहार',
  'देसी लोकल आलू',
];

const COMMON_VARIETIES_EN = [
  'Kufri Pukhraj',
  'Kufri Jyoti',
  'Chipsona-1',
  'Chipsona-3',
  '3797 Variety',
  'Kufri Mohan',
  'LR Red',
  'Lauvkar',
  'Kufri Bahar',
  'Desi Local Potato',
];

export const PotatoInView: React.FC<PotatoInViewProps> = ({
  language,
  farmers,
  chambers,
  inwards = [],
  initialFarmer,
  onSaveInward,
  onSaveInwardBatch,
  onOpenInvoiceModal,
}) => {
  const t = translations[language];

  const currentVarieties = language === 'hi' ? COMMON_VARIETIES_HI : COMMON_VARIETIES_EN;

  // Farmer selection
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(initialFarmer?.id || (farmers[0]?.id ?? ''));

  // "sabse phle konsa beej ha" -> Seed variety
  const [seedVariety, setSeedVariety] = useState<string>(currentVarieties[0]);
  const [customVariety, setCustomVariety] = useState<string>('');
  const [isCustomVariety, setIsCustomVariety] = useState(false);

  // "kitna gatta ha" -> Bag count
  const [bagCount, setBagCount] = useState<number>(200);

  // "gatta kitna kg ka ha" -> Weight per bag in KG
  const [weightPerBagKg, setWeightPerBagKg] = useState<number>(50);

  // "us din ki date" -> Inward date
  const [inwardDate, setInwardDate] = useState<string>(getTodayDate());

  // Chamber, Floor & Chhatta selection
  const [selectedChamberId, setSelectedChamberId] = useState<string>(chambers[0]?.id || '');
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedChhatta, setSelectedChhatta] = useState<number>(1);
  const [chhattaCapacity, setChhattaCapacity] = useState<number>(500);

  // Allocation Modes:
  // 'single': Single chamber & bay selection
  // 'chhatta_auto': "agr kisi ko 15000 bag add krna ha to vo apna ap chhatta vise potato divide krke apna ap add ho jaya ab ya bhi add kro"
  // 'chamber_auto': chamber-wise bulk auto-divide
  const [allocationMode, setAllocationMode] = useState<'single' | 'chhatta_auto' | 'chamber_auto'>('single');
  const isAutoDivide = allocationMode !== 'single';

  // Helper to compute bags stored in a specific chhatta
  const getChhattaOccupied = (chId: string, fl: number, ch: number) => {
    return inwards
      .filter((i) => {
        if (i.chamberId !== chId || i.remainingBags <= 0) return false;
        const isSameFloor = i.floorNo === `Floor ${fl}` || i.floorNo.includes(`Floor ${fl}`);
        const itemCh = i.chhattaNo ?? (i.floorNo.match(/Chhatta\s*(\d+)/i) ? parseInt(i.floorNo.match(/Chhatta\s*(\d+)/i)![1]) : undefined);
        return isSameFloor && itemCh === ch;
      })
      .reduce((sum, item) => sum + item.remainingBags, 0);
  };

  // "jo kiraya ha il season ka 160 rupee ha per gatta calculation ke saath total amount generate ho jaye"
  const rentPerBag = 160; // ₹160 per bag default season rent
  const totalRentAmount = (bagCount || 0) * rentPerBag;

  // "total wieght"
  const totalWeightKg = (bagCount || 0) * (weightPerBagKg || 0);
  const totalWeightQuintal = (totalWeightKg / 100).toFixed(1);

  // "aur payment status track karne ka bhi feature ho"
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const remainingRent = Math.max(0, totalRentAmount - (advancePaid || 0));

  let computedStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
  if (advancePaid >= totalRentAmount && totalRentAmount > 0) {
    computedStatus = 'PAID';
  } else if (advancePaid > 0) {
    computedStatus = 'PARTIAL';
  }

  // Vehicle & notes
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [capacityError, setCapacityError] = useState<string>('');

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);
  const selectedChamber = chambers.find((c) => c.id === selectedChamberId) || chambers[0];

  // Entire Cold Storage Capacity calculations
  const totalColdStorageCapacity = chambers.reduce((sum, c) => sum + c.totalCapacity, 0);
  const totalColdStorageFilled = chambers.reduce((sum, c) => sum + c.currentBags, 0);
  const totalColdStorageVacant = Math.max(0, totalColdStorageCapacity - totalColdStorageFilled);
  const isColdStorageCompletelyFull = totalColdStorageVacant <= 0;
  const isColdStorageExceeding = (bagCount || 0) > totalColdStorageVacant;

  // Chamber capacity calculations (for single chamber mode)
  const maxCapacity = selectedChamber?.totalCapacity || 20000;
  const currentFilled = selectedChamber?.currentBags || 0;
  const availableSpace = Math.max(0, maxCapacity - currentFilled);
  const isChamberFull = availableSpace <= 0;
  const isExceeding = (bagCount || 0) > availableSpace;

  // Chhatta capacity calculations ("jaise floor 1 chhatta 4 ma kitna bags a sakta ha hor kitna chattha ha total ha")
  const totalChhattasOnFloor = selectedChamber?.chhattasPerFloor || 10;
  const currentChhattaOccupied = getChhattaOccupied(selectedChamberId, selectedFloor, selectedChhatta);
  const currentChhattaVacant = Math.max(0, chhattaCapacity - currentChhattaOccupied);
  const isChhattaFull = currentChhattaVacant <= 0;
  const isChhattaExceeding = (bagCount || 0) > currentChhattaVacant;

  // 1. CHHATTA-WISE AUTO-DIVISION PLAN:
  // "agr kisi ko 15000 bag add krna ha to vo apna ap chhatta vise potato divide krke apna ap add ho jaya ab ya bhi add kro"
  const chhattaAutoDivisionPlan = React.useMemo(() => {
    const count = bagCount || 0;
    let remaining = count;

    interface ChhattaAlloc {
      chamberId: string;
      chamberName: string;
      floorNo: number;
      floorLabel: string;
      chhattaNo: number;
      chhattaCapacity: number;
      occupiedBefore: number;
      allocatedBags: number;
      occupiedAfter: number;
      isFullNow: boolean;
      rentAmount: number;
      advanceShare: number;
      remainingRentShare: number;
    }

    const items: ChhattaAlloc[] = [];

    // Order chambers starting from currently selected chamber, then the remaining
    const ordered = [...chambers].sort((a, b) => {
      if (a.id === selectedChamberId) return -1;
      if (b.id === selectedChamberId) return 1;
      return a.id.localeCompare(b.id);
    });

    for (const ch of ordered) {
      if (remaining <= 0) break;
      const flCount = ch.floorCount || 4;
      const chPerFl = ch.chhattasPerFloor || 10;
      const capPerCh = ch.capacityPerChhatta || chhattaCapacity || 500;

      for (let fl = 1; fl <= flCount; fl++) {
        if (remaining <= 0) break;
        for (let c = 1; c <= chPerFl; c++) {
          if (remaining <= 0) break;
          const occ = getChhattaOccupied(ch.id, fl, c);
          const vac = Math.max(0, capPerCh - occ);
          if (vac <= 0) continue;

          const take = Math.min(remaining, vac);
          const rentAmount = take * rentPerBag;
          const advanceShare = count > 0 ? Math.round((take / count) * (advancePaid || 0)) : 0;
          const remainingRentShare = Math.max(0, rentAmount - advanceShare);

          items.push({
            chamberId: ch.id,
            chamberName: ch.name,
            floorNo: fl,
            floorLabel: `Floor ${fl}`,
            chhattaNo: c,
            chhattaCapacity: capPerCh,
            occupiedBefore: occ,
            allocatedBags: take,
            occupiedAfter: occ + take,
            isFullNow: occ + take >= capPerCh,
            rentAmount,
            advanceShare,
            remainingRentShare,
          });

          remaining -= take;
        }
      }
    }

    // Group items by Chamber and Floor for clear presentation
    const groupedChambers: {
      chamberId: string;
      chamberName: string;
      totalBags: number;
      floors: {
        floorNo: number;
        floorLabel: string;
        totalBags: number;
        chhattas: ChhattaAlloc[];
      }[];
    }[] = [];

    items.forEach((item) => {
      let chGroup = groupedChambers.find((g) => g.chamberId === item.chamberId);
      if (!chGroup) {
        chGroup = {
          chamberId: item.chamberId,
          chamberName: item.chamberName,
          totalBags: 0,
          floors: [],
        };
        groupedChambers.push(chGroup);
      }
      chGroup.totalBags += item.allocatedBags;

      let flGroup = chGroup.floors.find((f) => f.floorNo === item.floorNo);
      if (!flGroup) {
        flGroup = {
          floorNo: item.floorNo,
          floorLabel: item.floorLabel,
          totalBags: 0,
          chhattas: [],
        };
        chGroup.floors.push(flGroup);
      }
      flGroup.totalBags += item.allocatedBags;
      flGroup.chhattas.push(item);
    });

    return {
      items,
      groupedChambers,
      unallocated: remaining,
      totalAllocated: count - remaining,
      isFullyAllocated: remaining === 0 && count > 0,
      totalChhattasCount: items.length,
    };
  }, [bagCount, chambers, selectedChamberId, chhattaCapacity, rentPerBag, advancePaid, inwards]);

  // 2. CHAMBER-WISE AUTO-DIVISION PLAN:
  // Auto-Division Plan across available chambers (Bulk Chamber Level)
  const autoDivisionPlan = React.useMemo(() => {
    const count = bagCount || 0;
    let remaining = count;
    const items: {
      chamber: Chamber;
      allocatedBags: number;
      vacantBefore: number;
      vacantAfter: number;
      rentAmount: number;
      advanceShare: number;
      remainingRentShare: number;
      floorNote: string;
    }[] = [];

    // Order chambers starting from current selected chamber, then remaining chambers
    const ordered = [...chambers].sort((a, b) => {
      if (a.id === selectedChamberId) return -1;
      if (b.id === selectedChamberId) return 1;
      return a.id.localeCompare(b.id);
    });

    for (const ch of ordered) {
      if (remaining <= 0) break;
      const vac = Math.max(0, ch.totalCapacity - ch.currentBags);
      if (vac <= 0) continue;
      const take = Math.min(remaining, vac);
      const rentAmount = take * rentPerBag;
      const advanceShare = count > 0 ? Math.round((take / count) * (advancePaid || 0)) : 0;
      const remainingRentShare = Math.max(0, rentAmount - advanceShare);

      items.push({
        chamber: ch,
        allocatedBags: take,
        vacantBefore: vac,
        vacantAfter: vac - take,
        rentAmount,
        advanceShare,
        remainingRentShare,
        floorNote: take >= 5000 ? 'समस्त तल (Floors 1-4 ऑटो-वितरण)' : 'फ्लोर 1-2',
      });
      remaining -= take;
    }

    return {
      items,
      unallocated: remaining,
      totalAllocated: count - remaining,
      isFullyAllocated: remaining === 0 && count > 0,
    };
  }, [bagCount, chambers, selectedChamberId, rentPerBag, advancePaid]);

  // Next available Chhatta finder
  const nextAvailableChhatta = (() => {
    // 1. Same floor next chhattas
    for (let c = 1; c <= totalChhattasOnFloor; c++) {
      if (c === selectedChhatta) continue;
      const occ = getChhattaOccupied(selectedChamberId, selectedFloor, c);
      if (chhattaCapacity - occ > 0) {
        return { floor: selectedFloor, chhatta: c, vacant: chhattaCapacity - occ };
      }
    }
    // 2. Other floors in same chamber
    for (let f = 1; f <= (selectedChamber?.floorCount || 4); f++) {
      if (f === selectedFloor) continue;
      for (let c = 1; c <= totalChhattasOnFloor; c++) {
        const occ = getChhattaOccupied(selectedChamberId, f, c);
        if (chhattaCapacity - occ > 0) {
          return { floor: f, chhatta: c, vacant: chhattaCapacity - occ };
        }
      }
    }
    return null;
  })();

  // Find next available chamber that has space left
  const nextAvailableChamber = chambers.find(
    (c) => c.id !== selectedChamber?.id && (c.totalCapacity - c.currentBags) > 0
  );

  // If the currently selected chamber is completely full, auto-shift to the next available chamber
  React.useEffect(() => {
    if (!isAutoDivide && isChamberFull && nextAvailableChamber) {
      setSelectedChamberId(nextAvailableChamber.id);
    }
  }, [selectedChamberId, isChamberFull, nextAvailableChamber, isAutoDivide]);

  // Update capacity error state
  React.useEffect(() => {
    if (isAutoDivide) {
      if (isColdStorageCompletelyFull) {
        setCapacityError(
          language === 'hi'
            ? '🛑 समस्त कोल्ड स्टोरेज पूर्णतः 100% भर चुका है! किसी भी चेंबर में कोई जगह नहीं है।'
            : '🛑 Entire cold storage is 100% full! No chambers have space.'
        );
      } else if (isColdStorageExceeding) {
        setCapacityError(
          language === 'hi'
            ? `⚠️ पूरे कोल्ड स्टोरेज में कुल केवल ${totalColdStorageVacant.toLocaleString('en-IN')} कट्टे की जगह शेष है! आप ${bagCount} कट्टे डाल रहे हैं जो ${(bagCount - totalColdStorageVacant).toLocaleString('en-IN')} कट्टे अधिक है।`
            : `⚠️ Total vacant space across all chambers is only ${totalColdStorageVacant.toLocaleString('en-IN')} bags! You entered ${bagCount} bags.`
        );
      } else {
        setCapacityError('');
      }
    } else {
      if (isChamberFull) {
        setCapacityError(
          language === 'hi'
            ? `🛑 यह चेंबर (${selectedChamber?.name}) पूर्णतः भर चुका है (${maxCapacity.toLocaleString('en-IN')}/${maxCapacity.toLocaleString('en-IN')} कट्टे)! इसमें और कट्टे नहीं आ सकते।`
            : `🛑 This chamber (${selectedChamber?.name}) is 100% full! No more bags can be added.`
        );
      } else if (isExceeding) {
        setCapacityError(
          language === 'hi'
            ? `⚠️ ${selectedChamber?.name} में केवल ${availableSpace.toLocaleString('en-IN')} कट्टे की जगह शेष है! आप ${bagCount} कट्टे डाल रहे हैं। (⚡ नीचे 'ऑटो चेंबर विभाजन' दबाएं)`
            : `⚠️ Only ${availableSpace.toLocaleString('en-IN')} bags space left in ${selectedChamber?.name}! (Use Auto-Divide for bulk bags)`
        );
      } else if (isChhattaFull) {
        setCapacityError(
          language === 'hi'
            ? `🛑 Floor ${selectedFloor} का लॉट #${selectedChhatta} पूर्णतः भर चुका है (500/500 कट्टे)! कृपया अगला खाली लॉट चुनें।`
            : `🛑 Floor ${selectedFloor}, Lot #${selectedChhatta} is 100% full! Please select next available lot.`
        );
      } else if (isChhattaExceeding) {
        setCapacityError(
          language === 'hi'
            ? `⚠️ Floor ${selectedFloor}, लॉट #${selectedChhatta} में केवल ${currentChhattaVacant.toLocaleString('en-IN')} कट्टे की जगह शेष है! आप ${bagCount} कट्टे डाल रहे हैं।`
            : `⚠️ Floor ${selectedFloor}, Lot #${selectedChhatta} has only ${currentChhattaVacant.toLocaleString('en-IN')} bags space left!`
        );
      } else {
        setCapacityError('');
      }
    }
  }, [
    isAutoDivide,
    selectedChamberId,
    selectedFloor,
    selectedChhatta,
    bagCount,
    isChamberFull,
    isExceeding,
    isChhattaFull,
    isChhattaExceeding,
    isColdStorageCompletelyFull,
    isColdStorageExceeding,
    availableSpace,
    currentChhattaVacant,
    totalColdStorageVacant,
    maxCapacity,
    language,
    selectedChamber?.name,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmer) {
      alert(language === 'hi' ? 'कृपया किसान चुनें' : 'Please select a farmer');
      return;
    }
    if (!bagCount || bagCount <= 0) {
      alert(language === 'hi' ? 'कृपया कट्टों की संख्या दर्ज करें' : 'Please enter valid bag count');
      return;
    }

    // 1. Lot-wise Auto-Division Submission
    if (allocationMode === 'chhatta_auto') {
      if (isColdStorageCompletelyFull) {
        alert(
          language === 'hi'
            ? 'कोल्ड स्टोरेज के सभी चेंबर व लॉट 100% भर चुके हैं! कोई जगह उपलब्ध नहीं है।'
            : 'All cold storage chambers and lots are completely full!'
        );
        return;
      }
      if (chhattaAutoDivisionPlan.unallocated > 0) {
        alert(
          language === 'hi'
            ? `त्रुटि: पूरे कोल्ड स्टोरेज में कुल केवल ${totalColdStorageVacant.toLocaleString('en-IN')} कट्टे की जगह बची है! आप ${bagCount} कट्टे नहीं डाल सकते।`
            : `Error: Total cold storage only has ${totalColdStorageVacant.toLocaleString('en-IN')} vacant bags!`
        );
        return;
      }
      if (chhattaAutoDivisionPlan.items.length === 0) {
        alert(language === 'hi' ? 'कोई लॉट उपलब्ध नहीं है!' : 'No lot available!');
        return;
      }

      const finalVariety = isCustomVariety && customVariety.trim() ? customVariety.trim() : seedVariety;
      const masterReceiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const entries: Omit<InwardEntry, 'id' | 'createdAt'>[] = chhattaAutoDivisionPlan.items.map((item, idx) => ({
        receiptNo: chhattaAutoDivisionPlan.items.length > 1 ? `${masterReceiptNo}-${String(idx + 1).padStart(2, '0')}` : masterReceiptNo,
        date: inwardDate,
        farmerId: selectedFarmer.id,
        farmerName: selectedFarmer.name,
        farmerPhone: selectedFarmer.phone,
        farmerVillage: selectedFarmer.village,
        seedVariety: finalVariety,
        bagCount: item.allocatedBags,
        weightPerBagKg,
        totalWeightKg: item.allocatedBags * weightPerBagKg,
        chamberId: item.chamberId,
        chamberName: item.chamberName,
        floorNo: item.floorLabel,
        chhattaNo: item.chhattaNo,
        lotNo: item.chhattaNo,
        chhattaCapacity: item.chhattaCapacity,
        lotCapacity: item.chhattaCapacity,
        rentPerBag,
        totalRentAmount: item.rentAmount,
        advancePaid: item.advanceShare,
        remainingRent: item.remainingRentShare,
        paymentStatus: item.remainingRentShare <= 0 ? 'PAID' : item.advanceShare > 0 ? 'PARTIAL' : 'UNPAID',
        remainingBags: item.allocatedBags,
        vehicleNo: vehicleNo.trim() || undefined,
        notes: notes.trim()
          ? `${notes.trim()} (लॉट स्वतः विभाजन ${item.floorLabel} लॉट #${item.chhattaNo})`
          : (language === 'hi'
              ? `ऑटो लॉट विभाजन (${item.chamberName} • ${item.floorLabel} • लॉट #${item.chhattaNo})`
              : `Auto Lot Division (${item.chamberName} • ${item.floorLabel} • Lot #${item.chhattaNo})`),
      }));

      let savedList: InwardEntry[];
      if (onSaveInwardBatch) {
        savedList = onSaveInwardBatch(entries);
      } else {
        savedList = entries.map((ent) => onSaveInward(ent));
      }

      setFeedbackSuccess(
        language === 'hi'
          ? `सफलतापूर्वक ${bagCount.toLocaleString('en-IN')} कट्टे ${chhattaAutoDivisionPlan.totalChhattasCount} लॉट में स्वतः विभाजित कर दिए गए और रसीद तैयार है!`
          : `Successfully divided ${bagCount.toLocaleString('en-IN')} bags across ${chhattaAutoDivisionPlan.totalChhattasCount} lots!`
      );
      onOpenInvoiceModal(savedList[0], savedList);
      return;
    }

    // 2. Chamber-wise Bulk Auto-Division Submission
    if (allocationMode === 'chamber_auto') {
      if (isColdStorageCompletelyFull) {
        alert(
          language === 'hi'
            ? 'कोल्ड स्टोरेज के सभी चेंबर 100% भर चुके हैं! कोई जगह उपलब्ध नहीं है।'
            : 'All cold storage chambers are completely full!'
        );
        return;
      }
      if (autoDivisionPlan.unallocated > 0) {
        alert(
          language === 'hi'
            ? `त्रुटि: पूरे कोल्ड स्टोरेज में कुल केवल ${totalColdStorageVacant.toLocaleString('en-IN')} कट्टे की जगह बची है! आप ${bagCount} कट्टे नहीं डाल सकते।`
            : `Error: Total cold storage only has ${totalColdStorageVacant.toLocaleString('en-IN')} vacant bags!`
        );
        return;
      }
      if (autoDivisionPlan.items.length === 0) {
        alert(language === 'hi' ? 'कोई चेंबर उपलब्ध नहीं है!' : 'No chambers available!');
        return;
      }

      const finalVariety = isCustomVariety && customVariety.trim() ? customVariety.trim() : seedVariety;
      const masterReceiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const entries: Omit<InwardEntry, 'id' | 'createdAt'>[] = [];
      let entryIndex = 1;

      for (const planItem of autoDivisionPlan.items) {
        let remainingInChamber = planItem.allocatedBags;
        const flCount = planItem.chamber.floorCount || 4;
        const lotsPerFl = planItem.chamber.chhattasPerFloor || 10;
        const capPerLot = planItem.chamber.capacityPerChhatta || 500;

        for (let fl = 1; fl <= flCount; fl++) {
          if (remainingInChamber <= 0) break;
          for (let c = 1; c <= lotsPerFl; c++) {
            if (remainingInChamber <= 0) break;
            const occ = getChhattaOccupied(planItem.chamber.id, fl, c);
            const vac = Math.max(0, capPerLot - occ);
            if (vac <= 0) continue;

            const take = Math.min(remainingInChamber, vac);
            const lotRent = take * rentPerBag;
            const lotAdvance = (bagCount || 0) > 0 ? Math.round((take / bagCount) * (advancePaid || 0)) : 0;
            const lotRemainingRent = Math.max(0, lotRent - lotAdvance);

            entries.push({
              receiptNo: autoDivisionPlan.items.length === 1 && take === planItem.allocatedBags
                ? masterReceiptNo
                : `${masterReceiptNo}-${String(entryIndex).padStart(2, '0')}`,
              date: inwardDate,
              farmerId: selectedFarmer.id,
              farmerName: selectedFarmer.name,
              farmerPhone: selectedFarmer.phone,
              farmerVillage: selectedFarmer.village,
              seedVariety: finalVariety,
              bagCount: take,
              weightPerBagKg,
              totalWeightKg: take * weightPerBagKg,
              chamberId: planItem.chamber.id,
              chamberName: planItem.chamber.name,
              floorNo: `Floor ${fl}`,
              chhattaNo: c,
              lotNo: c,
              chhattaCapacity: capPerLot,
              lotCapacity: capPerLot,
              rentPerBag,
              totalRentAmount: lotRent,
              advancePaid: lotAdvance,
              remainingRent: lotRemainingRent,
              paymentStatus: lotRemainingRent <= 0 ? 'PAID' : lotAdvance > 0 ? 'PARTIAL' : 'UNPAID',
              remainingBags: take,
              vehicleNo: vehicleNo.trim() || undefined,
              notes: notes.trim()
                ? `${notes.trim()} (${planItem.chamber.name} • Floor ${fl} • लॉट #${c})`
                : (language === 'hi'
                    ? `चेंबर लॉट आवंटन (${planItem.chamber.name} • Floor ${fl} • लॉट #${c})`
                    : `Chamber Lot Allocation (${planItem.chamber.name} • Floor ${fl} • Lot #${c})`),
            });

            entryIndex++;
            remainingInChamber -= take;
          }
        }

        // Safety fallback if chamber remaining
        if (remainingInChamber > 0) {
          const lotRent = remainingInChamber * rentPerBag;
          const lotAdvance = (bagCount || 0) > 0 ? Math.round((remainingInChamber / bagCount) * (advancePaid || 0)) : 0;
          const lotRemainingRent = Math.max(0, lotRent - lotAdvance);

          entries.push({
            receiptNo: `${masterReceiptNo}-${String(entryIndex).padStart(2, '0')}`,
            date: inwardDate,
            farmerId: selectedFarmer.id,
            farmerName: selectedFarmer.name,
            farmerPhone: selectedFarmer.phone,
            farmerVillage: selectedFarmer.village,
            seedVariety: finalVariety,
            bagCount: remainingInChamber,
            weightPerBagKg,
            totalWeightKg: remainingInChamber * weightPerBagKg,
            chamberId: planItem.chamber.id,
            chamberName: planItem.chamber.name,
            floorNo: 'Floor 1',
            chhattaNo: 1,
            lotNo: 1,
            chhattaCapacity: capPerLot,
            lotCapacity: capPerLot,
            rentPerBag,
            totalRentAmount: lotRent,
            advancePaid: lotAdvance,
            remainingRent: lotRemainingRent,
            paymentStatus: lotRemainingRent <= 0 ? 'PAID' : lotAdvance > 0 ? 'PARTIAL' : 'UNPAID',
            remainingBags: remainingInChamber,
            vehicleNo: vehicleNo.trim() || undefined,
            notes: notes.trim() || 'चेंबर स्टॉक',
          });
          entryIndex++;
        }
      }

      let savedList: InwardEntry[];
      if (onSaveInwardBatch) {
        savedList = onSaveInwardBatch(entries);
      } else {
        savedList = entries.map((ent) => onSaveInward(ent));
      }

      setFeedbackSuccess(
        language === 'hi'
          ? `सफलतापूर्वक ${bagCount.toLocaleString('en-IN')} कट्टे ${autoDivisionPlan.items.length} चेंबरों में विभाजित कर दिए गए और रसीद तैयार है!`
          : `Successfully divided ${bagCount.toLocaleString('en-IN')} bags across ${autoDivisionPlan.items.length} chambers!`
      );
      onOpenInvoiceModal(savedList[0], savedList);
      return;
    }

    // Strict chamber capacity validation: Glitch fix (Single Chamber Mode)
    if (isChamberFull) {
      if (nextAvailableChamber) {
        alert(
          language === 'hi'
            ? `यह चेंबर (${selectedChamber?.name}) पूरा भर चुका है! अगला उपलब्ध चेंबर (${nextAvailableChamber.name}) स्वतः चुना जा रहा है।`
            : `This chamber is full! Automatically switching to ${nextAvailableChamber.name}.`
        );
        setSelectedChamberId(nextAvailableChamber.id);
      } else {
        alert(
          language === 'hi'
            ? 'कोल्ड स्टोरेज के सभी चेंबर 100% भर चुके हैं! कोई जगह उपलब्ध नहीं है।'
            : 'All cold storage chambers are completely full! No space available.'
        );
      }
      return;
    }

    if (isExceeding) {
      alert(
        language === 'hi'
          ? `त्रुटि: ${selectedChamber?.name} में केवल ${availableSpace.toLocaleString('en-IN')} कट्टे की जगह शेष है! आप ${bagCount} कट्टे दर्ज नहीं कर सकते।`
          : `Error: Only ${availableSpace.toLocaleString('en-IN')} bags left in this chamber! Cannot add ${bagCount} bags.`
      );
      return;
    }

    // Strict Lot capacity validation
    if (isChhattaFull) {
      if (nextAvailableChhatta) {
        alert(
          language === 'hi'
            ? `Floor ${selectedFloor}, लॉट #${selectedChhatta} पूरा भरा है! अगला उपलब्ध लॉट (${nextAvailableChhatta.floor > selectedFloor ? `Floor ${nextAvailableChhatta.floor}, ` : ''}लॉट #${nextAvailableChhatta.chhatta}) चुना गया।`
            : `Lot #${selectedChhatta} is full! Switching to Lot #${nextAvailableChhatta.chhatta}.`
        );
        setSelectedFloor(nextAvailableChhatta.floor);
        setSelectedChhatta(nextAvailableChhatta.chhatta);
      } else {
        alert(
          language === 'hi'
            ? 'इस चेंबर के सभी लॉट भर चुके हैं! कृपया अगला चेंबर चुनें।'
            : 'All lots in this chamber are full! Please select another chamber.'
        );
      }
      return;
    }

    if (isChhattaExceeding) {
      alert(
        language === 'hi'
          ? `त्रुटि: Floor ${selectedFloor}, लॉट #${selectedChhatta} में केवल ${currentChhattaVacant.toLocaleString('en-IN')} कट्टे की जगह शेष है! आप ${bagCount} कट्टे दर्ज नहीं कर सकते।`
          : `Error: Only ${currentChhattaVacant.toLocaleString('en-IN')} bags space left in Lot #${selectedChhatta}!`
      );
      return;
    }

    const finalVariety = isCustomVariety && customVariety.trim() ? customVariety.trim() : seedVariety;
    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEntry: Omit<InwardEntry, 'id' | 'createdAt'> = {
      receiptNo,
      date: inwardDate,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      farmerPhone: selectedFarmer.phone,
      farmerVillage: selectedFarmer.village,
      seedVariety: finalVariety,
      bagCount,
      weightPerBagKg,
      totalWeightKg,
      chamberId: selectedChamber?.id || 'CH-1',
      chamberName: selectedChamber?.name || 'Chamber 1',
      floorNo: `Floor ${selectedFloor}`,
      chhattaNo: selectedChhatta,
      lotNo: selectedChhatta,
      chhattaCapacity,
      lotCapacity: chhattaCapacity,
      rentPerBag,
      totalRentAmount,
      advancePaid: advancePaid || 0,
      remainingRent,
      paymentStatus: computedStatus,
      remainingBags: bagCount, // initial remaining is all bags
      vehicleNo: vehicleNo.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    // Save and automatically open printable invoice: "Yeh sab details store karte hi automatic invoice generate ho"
    const saved = onSaveInward(newEntry);
    setFeedbackSuccess(t.inwardSuccess);
    onOpenInvoiceModal(saved);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center">
              <ArrowDownToDot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t.potatoInTitle}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{t.potatoInSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Season Rent Rate Stamp */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="text-amber-800 font-bold text-xs uppercase">
            <span>{t.seasonRentNote}</span>
            <div className="text-xl font-black font-mono text-amber-950">₹160 / कट्टा</div>
          </div>
        </div>
      </div>

      {feedbackSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Section 1: Farmer & Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                {t.selectFarmer} *
              </label>
              {farmers.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs">
                  ⚠️ {language === 'hi' ? 'कोई किसान पंजीकृत नहीं है। कृपया पहले "किसान सूची" टैब में जाकर किसान जोड़ें।' : 'No farmers registered yet. Please add a farmer first from the Farmers tab.'}
                </div>
              ) : (
                <>
                  <select
                    value={selectedFarmerId}
                    onChange={(e) => setSelectedFarmerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">{t.selectFarmerPrompt}</option>
                    {farmers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.name} ({f.village})
                      </option>
                    ))}
                  </select>
                  {selectedFarmer && (
                    <p className="text-xs text-slate-500 mt-1">
                      📞 {selectedFarmer.phone} &bull; 📍 {selectedFarmer.village}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* "us din ki date" */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>{t.inwardDate} *</span>
              </label>
              <input
                type="date"
                required
                value={inwardDate}
                onChange={(e) => setInwardDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: "sabse phle konsa beej ha", "kitna gatta ha", "gatta kitna kg ka ha", "total wieght" */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🥔</span> {language === 'hi' ? 'आलू बीज, मात्रा व स्थान विवरण' : 'Seed Variety, Quantity & Location'}
              </h3>

              {/* Mode Switch Tabs:
                  1. एकल चेंबर व लॉट नंबर (Single)
                  2. ⚡ लॉट अनुसार ऑटो-विभाजन (15,000 कट्टे)
                  3. 🏢 चेंबर थोक विभाजन (Bulk)
              */}
              <div className="bg-slate-200/80 p-1 rounded-xl flex flex-wrap gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAllocationMode('single')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    allocationMode === 'single'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🎯</span>
                  <span>{language === 'hi' ? 'एकल चेंबर व लॉट नंबर' : 'Single Chamber & Lot No.'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationMode('chhatta_auto')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    allocationMode === 'chhatta_auto'
                      ? 'bg-amber-800 text-white shadow-xs ring-2 ring-amber-400'
                      : 'text-amber-900 bg-amber-100 hover:bg-amber-200 font-bold'
                  }`}
                >
                  <span>⚡📦</span>
                  <span>{language === 'hi' ? 'लॉट अनुसार ऑटो-विभाजन (15,000 कट्टे)' : 'Lot Auto-Divide (15k)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationMode('chamber_auto')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    allocationMode === 'chamber_auto'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🏢</span>
                  <span>{language === 'hi' ? 'चेंबर थोक विभाजन' : 'Chamber Bulk'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Seed variety: "sabse phle konsa beej ha" */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  {t.seedVariety} *
                </label>
                {!isCustomVariety ? (
                  <select
                    value={seedVariety}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomVariety(true);
                      } else {
                        setSeedVariety(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {currentVarieties.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="CUSTOM">+ {language === 'hi' ? 'अन्य कोई किस्म लिखें (Other)' : 'Other Custom Variety'}</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customVariety}
                      onChange={(e) => setCustomVariety(e.target.value)}
                      placeholder={t.varietyPlaceholder}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomVariety(false)}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                    >
                      {language === 'hi' ? 'सूची' : 'List'}
                    </button>
                  </div>
                )}
              </div>

              {/* Single Chamber Selector OR Auto-Divide Mode Indicator */}
              {allocationMode === 'single' ? (
                /* Chamber & Floor Row */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                      <span>{t.selectChamber} *</span>
                      <span className="text-[11px] font-mono text-amber-800 font-bold">
                        {availableSpace.toLocaleString('en-IN')} {language === 'hi' ? 'खाली' : 'Vacant'}
                      </span>
                    </label>
                    <select
                      value={selectedChamberId}
                      onChange={(e) => setSelectedChamberId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {chambers.map((c) => {
                        const vac = Math.max(0, c.totalCapacity - c.currentBags);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} {vac <= 0 ? (language === 'hi' ? '(पूर्णतः भरा - 0 खाली)' : '(Full - 0 Vacant)') : `(${language === 'hi' ? 'खाली:' : 'Vacant:'} ${vac.toLocaleString('en-IN')} ${language === 'hi' ? 'कट्टे' : 'Bags'})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Floor Level Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      {t.floorLabel} *
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((fl) => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => setSelectedFloor(fl)}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border cursor-pointer ${
                            selectedFloor === fl
                              ? 'bg-amber-800 text-white border-amber-900 shadow-xs ring-2 ring-amber-500/50'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black">Floor {fl}</span>
                          <span className="text-[9px] opacity-80 block truncate">
                            {fl === 1 ? 'ग्राउंड' : fl === 2 ? 'प्रथम' : fl === 3 ? 'द्वितीय' : 'तृतीय'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : allocationMode === 'chhatta_auto' ? (
                /* Lot Auto-Divide Configuration Banner */
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase">
                      <span className="text-base">⚡📦</span>
                      <span>{language === 'hi' ? 'लॉट अनुसार स्वतः विभाजन (500 कट्टे प्रति लॉट)' : 'Lot-wise Auto Allocation (500 Bags/Lot)'}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded">
                      {chhattaAutoDivisionPlan.totalChhattasCount} {language === 'hi' ? 'लॉट प्रयुक्त' : 'Lots Used'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase">
                        {language === 'hi' ? 'शुरुआती चेंबर:' : 'Starting Chamber:'}
                      </label>
                      <select
                        value={selectedChamberId}
                        onChange={(e) => setSelectedChamberId(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                      >
                        {chambers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 uppercase">
                        {language === 'hi' ? 'प्रति लॉट क्षमता:' : 'Per Lot Capacity:'}
                      </label>
                      <div className="mt-0.5 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-800">
                        {chhattaCapacity} {language === 'hi' ? 'कट्टे / लॉट' : 'Bags / Lot'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chamber Bulk Auto-Divide Active Banner */
                <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-xl flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase">
                    <span className="text-base">🏢</span>
                    <span>{language === 'hi' ? 'चेंबर थोक विभाजन सक्रिय' : 'Chamber Bulk Division Active'}</span>
                  </div>
                  <p className="text-xs text-blue-800 mt-1">
                    {language === 'hi'
                      ? 'दर्ज किए गए कट्टे (उदा. 15,000 कट्टे) स्वतः सभी खाली चेंबरों में उनकी उपलब्ध जगह के अनुसार विभाजित होंगे।'
                      : 'Entered bags will automatically be distributed across chambers based on available space.'}
                  </p>
                </div>
              )}
            </div>

            {/* Single Chamber Lot Selection (Hidden when Auto-Divide is Active) */}
            {!isAutoDivide && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <span>🧱</span> {t.chhattaLabel} *
                  </span>
                  <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    {language === 'hi'
                      ? `Floor ${selectedFloor} में कुल ${totalChhattasOnFloor} लॉट • क्षमता: ${chhattaCapacity} कट्टे/लॉट`
                      : `Floor ${selectedFloor}: ${totalChhattasOnFloor} Total Lots • Capacity: ${chhattaCapacity} Bags/Lot`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Array.from({ length: totalChhattasOnFloor }, (_, i) => i + 1).map((chNum) => {
                    const occ = getChhattaOccupied(selectedChamberId, selectedFloor, chNum);
                    const vac = Math.max(0, chhattaCapacity - occ);
                    const isFull = vac <= 0;
                    const isSelected = selectedChhatta === chNum;

                    return (
                      <button
                        key={chNum}
                        type="button"
                        onClick={() => setSelectedChhatta(chNum)}
                        className={`p-2 rounded-xl text-left border transition relative cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-700 text-white border-amber-800 shadow-md ring-2 ring-amber-400'
                            : isFull
                            ? 'bg-rose-50 border-rose-200 text-rose-800 opacity-75'
                            : vac < 200
                            ? 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100/70'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-black text-xs">{language === 'hi' ? `लॉट ${chNum}` : `Lot ${chNum}`}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            isFull ? 'bg-rose-500' : vac < 200 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                        </div>
                        <div className="mt-1 text-[10px] font-mono font-bold">
                          {isFull ? (
                            <span className={isSelected ? 'text-white' : 'text-rose-600'}>{language === 'hi' ? 'फुल (0 खाली)' : 'Full (0 Vacant)'}</span>
                          ) : (
                            <span className={isSelected ? 'text-amber-200' : 'text-emerald-700'}>
                              {vac} {language === 'hi' ? 'खाली' : 'Vacant'} / {chhattaCapacity}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bags and Weight Calculation Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {/* "kitna gatta ha" with Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    {t.bagCount} *
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {isAutoDivide
                      ? (language === 'hi'
                          ? `कोल्ड स्टोरेज कुल खाली: ${totalColdStorageVacant.toLocaleString('en-IN')}`
                          : `Total Storage Vacant: ${totalColdStorageVacant.toLocaleString('en-IN')}`)
                      : (language === 'hi'
                          ? `लॉट Max: ${currentChhattaVacant.toLocaleString('en-IN')}`
                          : `Lot Max: ${currentChhattaVacant.toLocaleString('en-IN')}`)}
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={isAutoDivide ? totalColdStorageVacant : currentChhattaVacant > 0 ? currentChhattaVacant : 0}
                  required
                  value={bagCount || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setBagCount(val);
                    if (!isAutoDivide && val > availableSpace) {
                      // Recommend auto-divide for bulk
                    }
                  }}
                  placeholder={language === 'hi' ? 'उदा. 15000' : 'e.g. 15000'}
                  className={`w-full px-3.5 py-2 bg-white border rounded-xl text-slate-900 text-base font-bold font-mono focus:ring-2 focus:outline-none ${
                    (isAutoDivide && isColdStorageExceeding) ||
                    (!isAutoDivide && (isChhattaExceeding || isChhattaFull || isExceeding || isChamberFull))
                      ? 'border-rose-500 focus:ring-rose-400 bg-rose-50/50'
                      : 'border-slate-300 focus:ring-amber-500'
                  }`}
                />

                {/* Quick Presets for Easy 15,000 Bags Entry */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[200, 500, 1000, 5000, 10000, 15000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBagCount(preset);
                        if (preset > 500) {
                          setAllocationMode('chhatta_auto');
                        }
                      }}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold transition border cursor-pointer ${
                        bagCount === preset
                          ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {preset >= 1000 ? `${preset.toLocaleString('en-IN')}` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* "gatta kitna kg ka ha" */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.bagWeightKg} *
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  required
                  value={weightPerBagKg || ''}
                  onChange={(e) => setWeightPerBagKg(parseFloat(e.target.value) || 0)}
                  placeholder={language === 'hi' ? 'उदा. 50' : 'e.g. 50'}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-base font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* "total wieght" */}
              <div className="bg-amber-100/70 p-3 rounded-xl border border-amber-200 flex flex-col justify-center">
                <span className="text-[11px] text-amber-900 font-bold uppercase">{t.totalWeight}</span>
                <div className="text-lg font-black text-amber-950 font-mono">
                  {totalWeightKg.toLocaleString('en-IN')} kg
                </div>
                <div className="text-xs text-amber-800 font-semibold">
                  ≈ {totalWeightQuintal} {language === 'hi' ? 'क्विंटल' : 'Quintals'}
                </div>
              </div>
            </div>

            {/* If Single Chamber Mode has large amount, show instant Auto-Divide buttons */}
            {allocationMode === 'single' && (bagCount > currentChhattaVacant || bagCount > availableSpace) && (
              <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-amber-950">
                  <span className="text-xl">💡</span>
                  <span>
                    {language === 'hi' ? (
                      <>आप <strong>{(bagCount || 0).toLocaleString('en-IN')} कट्टे</strong> दर्ज कर रहे हैं जो एकल लॉट (क्षमता {chhattaCapacity} कट्टे) में नहीं आ सकते! क्या आप इसे लॉट-दर-लॉट या चेंबरों में स्वतः बाँटना चाहते हैं?</>
                    ) : (
                      <>You entered <strong>{(bagCount || 0).toLocaleString('en-IN')} bags</strong> which exceed a single lot capacity ({chhattaCapacity} bags). Would you like to auto-distribute across lots or chambers?</>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAllocationMode('chhatta_auto')}
                    className="bg-amber-800 hover:bg-amber-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>⚡📦</span>
                    <span>{language === 'hi' ? 'लॉट-दर-लॉट स्वतः बाँटें' : 'Auto-Divide Lot-wise'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMode('chamber_auto')}
                    className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>🏢</span>
                    <span>{language === 'hi' ? 'चेंबर थोक बाँटें' : 'Bulk Chamber Divide'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1. LOT-WISE AUTO ALLOCATION PLAN */}
            {allocationMode === 'chhatta_auto' && (
              <div className="mt-4 p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡📦</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        {language === 'hi' ? 'लॉट अनुसार स्वतः आवंटन योजना' : 'Lot-wise Auto-Allocation Plan'}
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        {language === 'hi'
                          ? `${bagCount || 0} कट्टे लॉट-दर-लॉट (${chhattaCapacity} कट्टे प्रति लॉट क्षमता) मंजिलों व चेंबरों में स्वतः आवंटित किए गए हैं`
                          : `${bagCount || 0} bags automatically allocated across lots (${chhattaCapacity} bags/lot capacity)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-200 text-amber-950 font-bold px-2.5 py-1 rounded-full font-mono">
                      {chhattaAutoDivisionPlan.totalChhattasCount} {language === 'hi' ? 'लॉट प्रयुक्त' : 'Lots Used'}
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-full border border-emerald-300 font-mono">
                      {chhattaAutoDivisionPlan.totalAllocated.toLocaleString('en-IN')} / {(bagCount || 0).toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे आवंटित' : 'Bags Allocated'}
                    </span>
                  </div>
                </div>

                {/* Grouped Allocation Display: Chamber -> Floor -> Lot Chips */}
                <div className="space-y-3">
                  {chhattaAutoDivisionPlan.groupedChambers.map((chGroup) => (
                    <div key={chGroup.chamberId} className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏢</span>
                          <h5 className="font-bold text-slate-900 text-sm">{chGroup.chamberName}</h5>
                        </div>
                        <span className="text-xs font-black font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          +{chGroup.totalBags.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
                        </span>
                      </div>

                      {chGroup.floors.map((fl) => (
                        <div key={fl.floorNo} className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                              <span>📍</span>
                              <span>
                                {fl.floorLabel} ({fl.floorNo === 1 ? (language === 'hi' ? 'ग्राउंड' : 'Ground') : fl.floorNo === 2 ? (language === 'hi' ? 'प्रथम' : '1st') : fl.floorNo === 3 ? (language === 'hi' ? 'द्वितीय' : '2nd') : (language === 'hi' ? 'तृतीय' : '3rd')})
                              </span>
                            </span>
                            <span className="text-[11px] font-mono text-amber-900 font-semibold">
                              {fl.chhattas.length} {language === 'hi' ? 'लॉट प्रयुक्त' : 'Lots'} &bull; +{fl.totalBags.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {fl.chhattas.map((chAlloc) => (
                              <div
                                key={chAlloc.chhattaNo}
                                className="p-2 rounded-lg border bg-white border-amber-200 shadow-2xs flex flex-col justify-between text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{language === 'hi' ? `लॉट #${chAlloc.chhattaNo}` : `Lot #${chAlloc.chhattaNo}`}</span>
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded font-mono">
                                    {chAlloc.isFullNow ? (language === 'hi' ? 'फुल (500)' : 'Full (500)') : `${chAlloc.occupiedAfter}/500`}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-baseline justify-between">
                                  <span className="text-[10px] text-slate-400">{language === 'hi' ? 'आवक:' : 'In:'}</span>
                                  <span className="text-xs font-black font-mono text-emerald-700">
                                    +{chAlloc.allocatedBags.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* If unallocated bags remain */}
                {chhattaAutoDivisionPlan.unallocated > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      {language === 'hi' ? (
                        <>कोल्ड स्टोरेज के सभी लॉट भरने के बाद भी <strong>{chhattaAutoDivisionPlan.unallocated.toLocaleString('en-IN')} कट्टे</strong> के लिए जगह शेष नहीं है!</>
                      ) : (
                        <>Storage is completely full; no space left for <strong>{chhattaAutoDivisionPlan.unallocated.toLocaleString('en-IN')} bags</strong>!</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 2. CHAMBER-WISE BULK AUTO ALLOCATION PLAN */}
            {allocationMode === 'chamber_auto' && (
              <div className="mt-4 p-4 rounded-xl border-2 border-blue-300 bg-blue-50/50 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        {language === 'hi' ? 'चेंबर अनुसार थोक विभाजन योजना' : 'Chamber-wise Bulk Allocation Plan'}
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        {language === 'hi'
                          ? `${bagCount || 0} कट्टे उपलब्ध चेंबरों की क्षमता अनुसार स्वतः आवंटित किए गए हैं`
                          : `${bagCount || 0} bags distributed across available chambers`}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-full border border-emerald-300 font-mono">
                    {autoDivisionPlan.totalAllocated.toLocaleString('en-IN')} / {(bagCount || 0).toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे आवंटित' : 'Bags Allocated'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {autoDivisionPlan.items.map((item, idx) => {
                    const fillPct = Math.min(100, Math.round(((item.chamber.currentBags + item.allocatedBags) / item.chamber.totalCapacity) * 100));

                    return (
                      <div
                        key={item.chamber.id}
                        className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-blue-800 uppercase bg-blue-100 px-1.5 py-0.5 rounded font-mono">
                              {language === 'hi' ? `भाग ${idx + 1}` : `Part ${idx + 1}`}
                            </span>
                            <h5 className="font-bold text-slate-900 text-sm mt-1">{item.chamber.name}</h5>
                            <span className="text-[11px] text-slate-500">{item.floorNote}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-black font-mono text-emerald-800 block">
                              +{item.allocatedBags.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">
                              {language === 'hi' ? 'कट्टे इस चेंबर में' : 'Bags in Chamber'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs grid grid-cols-2 gap-2 text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 block">
                              {language === 'hi' ? 'पहले खाली जगह:' : 'Space Before:'}
                            </span>
                            <strong className="font-mono text-slate-700">{item.vacantBefore.toLocaleString('en-IN')}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">
                              {language === 'hi' ? 'आवंटन बाद शेष:' : 'Space After:'}
                            </span>
                            <strong className={`font-mono ${item.vacantAfter === 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {item.vacantAfter === 0
                                ? (language === 'hi' ? '0 (100% पूरा भरा)' : '0 (Full)')
                                : `${item.vacantAfter.toLocaleString('en-IN')} ${language === 'hi' ? 'कट्टे' : 'Bags'}`}
                            </strong>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>{language === 'hi' ? 'चेंबर भराव स्तर:' : 'Chamber Occupancy:'}</span>
                            <span className="font-mono font-bold">{fillPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                fillPct >= 100 ? 'bg-rose-500' : fillPct > 80 ? 'bg-blue-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {autoDivisionPlan.unallocated > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      {language === 'hi' ? (
                        <>कोल्ड स्टोरेज के सभी चेंबर भरने के बाद भी <strong>{autoDivisionPlan.unallocated.toLocaleString('en-IN')} कट्टे</strong> के लिए जगह नहीं बची है!</>
                      ) : (
                        <>All chambers full; no space for <strong>{autoDivisionPlan.unallocated.toLocaleString('en-IN')} bags</strong>!</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. SINGLE CHAMBER & LOT CAPACITY LIVE STATUS BOX */}
            {allocationMode === 'single' && (
              <div className="mt-4 p-4 rounded-xl border bg-slate-50 border-slate-300 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏢</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        {selectedChamber?.name} &bull; Floor {selectedFloor} &bull; {language === 'hi' ? `लॉट ${selectedChhatta}` : `Lot ${selectedChhatta}`}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {language === 'hi'
                          ? `Floor ${selectedFloor} में कुल ${totalChhattasOnFloor} लॉट | लाइव क्षमता व भराव स्थिति`
                          : `Floor ${selectedFloor} total ${totalChhattasOnFloor} lots | Live capacity & occupancy`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${
                      isChhattaFull
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : currentChhattaVacant < 150
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {isChhattaFull
                        ? (language === 'hi' ? '🛑 लॉट 100% पूरा भरा' : '🛑 Lot Full')
                        : (language === 'hi' ? `✅ लॉट में ${currentChhattaVacant.toLocaleString('en-IN')} कट्टे खाली` : `✅ ${currentChhattaVacant.toLocaleString('en-IN')} Bags Vacant`)}
                    </span>
                  </div>
                </div>

                {/* 4 Lot Metrics in Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">
                      {language === 'hi' ? 'लॉट कुल क्षमता' : 'Lot Capacity'}
                    </span>
                    <strong className="text-sm font-black text-slate-900 font-mono">
                      {chhattaCapacity.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">
                      {language === 'hi' ? 'लॉट में भरा हुआ' : 'Stored in Lot'}
                    </span>
                    <strong className="text-sm font-black text-amber-900 font-mono">
                      {currentChhattaOccupied.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">
                      {language === 'hi' ? 'लॉट में खाली जगह' : 'Vacant in Lot'}
                    </span>
                    <strong className={`text-sm font-black font-mono ${currentChhattaVacant > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {currentChhattaVacant.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">
                      {language === 'hi' ? 'यह आवक रखने के बाद' : 'After this Entry'}
                    </span>
                    <strong className={`text-sm font-black font-mono ${isChhattaExceeding ? 'text-rose-700' : 'text-blue-900'}`}>
                      {Math.min(chhattaCapacity, currentChhattaOccupied + (bagCount || 0)).toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">{language === 'hi' ? 'कट्टे' : 'Bags'}</span>
                    </strong>
                  </div>
                </div>

                {/* Progress Bar for Lot */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>{language === 'hi' ? `लॉट ${selectedChhatta} भराव स्तर:` : `Lot ${selectedChhatta} Occupancy:`}</span>
                    <span className="font-mono font-bold">
                      {Math.min(100, Math.round(((currentChhattaOccupied + (isChhattaExceeding ? 0 : (bagCount || 0))) / chhattaCapacity) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isChhattaFull || isChhattaExceeding
                          ? 'bg-rose-500'
                          : ((currentChhattaOccupied + (bagCount || 0)) / chhattaCapacity) > 0.85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((currentChhattaOccupied + (isChhattaExceeding ? 0 : (bagCount || 0))) / chhattaCapacity) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Chamber Level Summary Line */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>
                    {selectedChamber?.name} {language === 'hi' ? 'कुल चेंबर क्षमता:' : 'Total Chamber Capacity:'}{' '}
                    <strong>{maxCapacity.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}</strong>
                  </span>
                  <span>
                    {language === 'hi' ? 'चेंबर में शेष खाली:' : 'Remaining Vacant:'}{' '}
                    <strong className="text-emerald-800 font-mono">{availableSpace.toLocaleString('en-IN')} {language === 'hi' ? 'कट्टे' : 'Bags'}</strong>
                  </span>
                </div>

                {/* Capacity Error Banner & Auto-shift Actions */}
                {capacityError && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 text-xs space-y-2">
                    <div className="font-bold flex items-start gap-1.5">
                      <span>⚠️</span>
                      <span>{capacityError}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-200">
                      {/* Shift to next Lot button */}
                      {nextAvailableChhatta && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFloor(nextAvailableChhatta.floor);
                            setSelectedChhatta(nextAvailableChhatta.chhatta);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>
                            👉 {language === 'hi'
                              ? `अगले खाली लॉट में शिफ्ट करें (Floor ${nextAvailableChhatta.floor}, लॉट #${nextAvailableChhatta.chhatta})`
                              : `Shift to next vacant lot (Floor ${nextAvailableChhatta.floor}, Lot #${nextAvailableChhatta.chhatta})`}
                          </span>
                          <span className="bg-emerald-900 text-emerald-200 px-1.5 py-0.2 rounded text-[10px]">
                            {nextAvailableChhatta.vacant} {language === 'hi' ? 'खाली' : 'Vacant'}
                          </span>
                        </button>
                      )}

                      {/* Fill remaining space in this Lot */}
                      {currentChhattaVacant > 0 && isChhattaExceeding && (
                        <button
                          type="button"
                          onClick={() => setBagCount(currentChhattaVacant)}
                          className="bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                        >
                          {language === 'hi'
                            ? `इस लॉट की बची जगह (${currentChhattaVacant} कट्टे) भरें`
                            : `Fill remaining space in this lot (${currentChhattaVacant} bags)`}
                        </button>
                      )}

                      {/* Shift to next Chamber button if entire chamber is full */}
                      {isChamberFull && nextAvailableChamber && (
                        <button
                          type="button"
                          onClick={() => setSelectedChamberId(nextAvailableChamber.id)}
                          className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>👉 {language === 'hi' ? `अगले चेंबर (${nextAvailableChamber.name}) में शिफ्ट करें` : `Shift to next chamber (${nextAvailableChamber.name})`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: "kiraya ha il season ka 160 rupee ha per gatta calculation ke saath total amount generate ho jaye" */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-700" />
              <span>{language === 'hi' ? 'किराया व अग्रिम भुगतान गणना' : 'Rent & Payment Calculation'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Rent auto generated: gatta * 160 */}
              <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300">
                <span className="text-xs text-emerald-800 font-bold block uppercase">
                  {t.totalRentGenerated}
                </span>
                <div className="text-2xl font-black text-emerald-950 font-mono mt-1">
                  ₹{totalRentAmount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {bagCount || 0} {language === 'hi' ? 'कट्टे' : 'bags'} &times; ₹160/{language === 'hi' ? 'कट्टा' : 'bag'}
                </span>
              </div>

              {/* Advance Paid input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  {t.advancePayment}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={advancePaid || ''}
                    onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setAdvancePaid(0)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancePaid(Math.round(totalRentAmount / 2))}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancePaid(totalRentAmount)}
                    className="text-[11px] bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded text-emerald-800 font-bold"
                  >
                    100% {language === 'hi' ? 'पूर्ण' : 'Full'}
                  </button>
                </div>
              </div>

              {/* Remaining Rent Due */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-600 font-bold block uppercase">
                    {t.remainingRentDue}
                  </span>
                  <div className={`text-xl font-black font-mono mt-1 ${remainingRent > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    ₹{remainingRent.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                    computedStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : computedStatus === 'PARTIAL'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {computedStatus === 'PAID' ? t.statusPaid : computedStatus === 'PARTIAL' ? t.statusPartial : t.statusUnpaid}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Optional Details: Vehicle & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {t.vehicleNo}
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="उदा. UP 80 AZ 1234 / ट्रैक्टर ट्रॉली"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {t.notesRemarks}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="उदा. बढ़िया गुणवत्ता, मुंशी नोट"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Form Footer & Automatic Invoice Trigger Button */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>
              {language === 'hi'
                ? 'सुरक्षित करते ही प्रिंट हेतु आवक रसीद (Gate Pass Parchi) स्वतः खुल जाएगी।'
                : 'Saving will automatically generate the printable Inward Gate Pass receipt.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={(() => {
              if (!selectedFarmer || !bagCount || bagCount <= 0) return true;
              if (allocationMode === 'chhatta_auto') {
                return isColdStorageCompletelyFull || chhattaAutoDivisionPlan.unallocated > 0;
              }
              if (allocationMode === 'chamber_auto') {
                return isColdStorageCompletelyFull || autoDivisionPlan.unallocated > 0;
              }
              return isChamberFull || isExceeding || isChhattaFull || isChhattaExceeding;
            })()}
            className={`px-6 py-3 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${
              ((() => {
                if (!selectedFarmer || !bagCount || bagCount <= 0) return true;
                if (allocationMode === 'chhatta_auto') {
                  return isColdStorageCompletelyFull || chhattaAutoDivisionPlan.unallocated > 0;
                }
                if (allocationMode === 'chamber_auto') {
                  return isColdStorageCompletelyFull || autoDivisionPlan.unallocated > 0;
                }
                return isChamberFull || isExceeding || isChhattaFull || isChhattaExceeding;
              })())
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>
              {(() => {
                if (allocationMode === 'chhatta_auto') {
                  if (isColdStorageCompletelyFull) {
                    return language === 'hi' ? 'कोल्ड स्टोरेज पूरा भरा है (No Space)' : 'Cold Storage 100% Full';
                  }
                  if (chhattaAutoDivisionPlan.unallocated > 0) {
                    return language === 'hi' ? 'लॉट में जगह कम है' : 'Not Enough Space Across Lots';
                  }
                  return language === 'hi'
                    ? `⚡ ${(bagCount || 0).toLocaleString('en-IN')} कट्टे ${chhattaAutoDivisionPlan.totalChhattasCount} लॉट में दर्ज करें व रसीद बनाएं`
                    : `⚡ Save ${(bagCount || 0).toLocaleString('en-IN')} Bags in ${chhattaAutoDivisionPlan.totalChhattasCount} Lots & Print`;
                }

                if (allocationMode === 'chamber_auto') {
                  if (isColdStorageCompletelyFull) {
                    return language === 'hi' ? 'कोल्ड स्टोरेज पूरा भरा है' : 'Cold Storage Full';
                  }
                  if (autoDivisionPlan.unallocated > 0) {
                    return language === 'hi' ? 'चेंबरों में जगह कम है' : 'Not Enough Space Across Chambers';
                  }
                  return language === 'hi'
                    ? `⚡ ${(bagCount || 0).toLocaleString('en-IN')} कट्टे ${autoDivisionPlan.items.length} चेंबरों में दर्ज करें व रसीद बनाएं`
                    : `⚡ Save ${(bagCount || 0).toLocaleString('en-IN')} Bags in ${autoDivisionPlan.items.length} Chambers & Print`;
                }

                if (isChamberFull) {
                  return language === 'hi' ? 'चेंबर पूरा भरा है (अगला चुनें)' : 'Chamber Full (Select Next)';
                }
                if (isExceeding) {
                  return language === 'hi' ? 'कट्टे चेंबर क्षमता से अधिक हैं' : 'Exceeds Chamber Capacity';
                }
                if (isChhattaFull) {
                  return language === 'hi' ? 'लॉट पूरा भरा है (अगला लॉट चुनें)' : 'Lot Full (Select Next)';
                }
                if (isChhattaExceeding) {
                  return language === 'hi' ? 'कट्टे लॉट की क्षमता से अधिक हैं' : 'Exceeds Lot Capacity';
                }
                return t.saveAndGenerateInvoice;
              })()}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
