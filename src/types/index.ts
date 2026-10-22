export type Language = 'hi' | 'en';

export interface Farmer {
  id: string;
  code: string;
  name: string;
  fatherName?: string;
  phone: string;
  village: string;
  aadharNo?: string;
  createdAt: string;
}

export interface Chamber {
  id: string;
  name: string;
  nameHi: string;
  totalCapacity: number; // in bags
  floorCount: number;
  chhattasPerFloor?: number; // e.g. 10 lots per floor
  capacityPerChhatta?: number; // e.g. 500 bags per lot
  lotsPerFloor?: number;
  capacityPerLot?: number;
  currentBags: number;
  temperature: number; // e.g. 3.4 C
  humidity: number; // e.g. 90%
}

export interface InwardEntry {
  id: string;
  receiptNo: string;
  date: string; // YYYY-MM-DD
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  seedVariety: string; // बीज की किस्म (e.g., Pukhraj, Jyoti, Chipsona, etc.)
  bagCount: number; // कट्टों की संख्या
  weightPerBagKg: number; // प्रति कट्टा वजन (kg)
  totalWeightKg: number; // कुल वजन (kg)
  chamberId: string;
  chamberName: string;
  floorNo: string; // Floor 1, Floor 2, etc.
  chhattaNo?: number; // Kept for backwards compatibility
  lotNo?: number; // लॉट नंबर (Lot No.)
  chhattaCapacity?: number;
  lotCapacity?: number;
  rentPerBag: number; // किराया प्रति कट्टा (default ₹160)
  totalRentAmount: number; // कुल किराया राशि (bagCount * rentPerBag)
  advancePaid: number; // जमा अग्रिम राशि
  remainingRent: number; // शेष किराया
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  remainingBags: number; // वर्तमान में बचे कट्टे (for partial or future withdrawal)
  vehicleNo?: string; // गाड़ी नंबर
  notes?: string;
  createdAt: string;
}

export interface OutwardEntry {
  id: string;
  gatePassNo: string;
  date: string; // YYYY-MM-DD
  inwardEntryId: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  seedVariety: string;
  chamberId: string;
  chamberName: string;
  floorNo: string;
  chhattaNo?: number;
  lotNo?: number;
  bagsOut: number; // निकाले गए कट्टे
  rentPerBag: number; // ₹160
  grossRentDue: number; // bagsOut * rentPerBag
  advanceAdjusted: number; // पूर्व जमा में से कटा
  handlingFee: number; // पल्लेदारी / लोडिंग (optional)
  netAmountPaid: number; // किसान द्वारा दिया गया शुद्ध भुगतान
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER';
  paymentRef?: string;
  receiverName?: string;
  vehicleNo?: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'OWNER' | 'FULL_ACCESS' | 'MANAGER';
  isActive: boolean;
  createdAt: string;
}

export interface AppState {
  farmers: Farmer[];
  chambers: Chamber[];
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  adminEmail: string;
  adminPasswordHash: string; // simple simulation hash or text
  users: UserAccount[]; // Friends and staff with full access
}

