import { AppState, Farmer, Chamber, InwardEntry, OutwardEntry } from '../types';

const STORAGE_KEY = 'coldstoragex_v1';
const AUTH_KEY = 'coldstoragex_auth_user';

export const INITIAL_CHAMBERS: Chamber[] = [
  {
    id: 'CH-1',
    name: 'Chamber 1 (Ground & 1st Floor)',
    nameHi: 'चेंबर 1 (ग्राउंड व प्रथम तल)',
    totalCapacity: 20000,
    floorCount: 4,
    chhattasPerFloor: 10,
    capacityPerChhatta: 500,
    currentBags: 0,
    temperature: 3.2,
    humidity: 91,
  },
  {
    id: 'CH-2',
    name: 'Chamber 2 (Central Block)',
    nameHi: 'चेंबर 2 (सेंट्रल ब्लॉक)',
    totalCapacity: 20000,
    floorCount: 4,
    chhattasPerFloor: 10,
    capacityPerChhatta: 500,
    currentBags: 0,
    temperature: 3.5,
    humidity: 92,
  },
  {
    id: 'CH-3',
    name: 'Chamber 3 (North Wing)',
    nameHi: 'चेंबर 3 (उत्तर विंग)',
    totalCapacity: 20000,
    floorCount: 4,
    chhattasPerFloor: 10,
    capacityPerChhatta: 500,
    currentBags: 0,
    temperature: 3.1,
    humidity: 89,
  },
  {
    id: 'CH-4',
    name: 'Chamber 4 (New Cold Wing)',
    nameHi: 'चेंबर 4 (नवीन विंग)',
    totalCapacity: 20000,
    floorCount: 4,
    chhattasPerFloor: 10,
    capacityPerChhatta: 500,
    currentBags: 0,
    temperature: 3.3,
    humidity: 93,
  },
];

// Completely clean/empty initial data as requested by the user
export const INITIAL_FARMERS: Farmer[] = [];
export const INITIAL_INWARDS: InwardEntry[] = [];
export const INITIAL_OUTWARDS: OutwardEntry[] = [];

export function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1 < 10 ? `0${d.getMonth() + 1}` : `${d.getMonth() + 1}`;
  const day = d.getDate() < 10 ? `0${d.getDate()}` : `${d.getDate()}`;
  return `${year}-${month}-${day}`;
}

export function getLastMonth8thDate(): string {
  const d = new Date();
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const month = d.getMonth() === 0 ? 12 : d.getMonth();
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  return `${year}-${monthStr}-08`;
}

export function getInitialAppState(): AppState {
  return {
    farmers: [],
    chambers: INITIAL_CHAMBERS,
    inwards: [],
    outwards: [],
    adminEmail: 'rajdeepsingh5618@gmail.com',
    adminPasswordHash: 'jatt@1234',
    users: [],
  };
}

export function loadAppState(): AppState {
  try {
    // Clear out old data from previous key to respect user's explicit "sab hata do remove kr do"
    localStorage.removeItem('kisan_cold_storage_v1');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialAppState();
      saveAppState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const loadedChambers = parsed.chambers && parsed.chambers.length > 0 
      ? parsed.chambers.map((c: Chamber) => ({
          ...c,
          totalCapacity: 20000,
          floorCount: c.floorCount || 4,
          chhattasPerFloor: c.chhattasPerFloor || 10,
          capacityPerChhatta: c.capacityPerChhatta || 500,
        }))
      : INITIAL_CHAMBERS;

    // Use admin credentials configured by user
    const adminEmail =
      !parsed.adminEmail || parsed.adminEmail === 'admin@coldstorage.com'
        ? 'rajdeepsingh5618@gmail.com'
        : parsed.adminEmail;

    const adminPasswordHash =
      !parsed.adminPasswordHash || parsed.adminPasswordHash === 'admin123'
        ? 'jatt@1234'
        : parsed.adminPasswordHash;

    const state: AppState = {
      farmers: parsed.farmers || [],
      chambers: loadedChambers,
      inwards: parsed.inwards || [],
      outwards: parsed.outwards || [],
      adminEmail,
      adminPasswordHash,
      users: parsed.users || [],
    };

    // Keep stored state up-to-date with new admin credentials
    if (parsed.adminEmail !== adminEmail || parsed.adminPasswordHash !== adminPasswordHash) {
      saveAppState(state);
    }

    return state;
  } catch {
    return getInitialAppState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function getAuthUser(): string | null {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored || stored === 'LOGGED_OUT') return null;
  return stored;
}

export function setAuthUser(email: string | null): void {
  if (email) {
    localStorage.setItem(AUTH_KEY, email);
  } else {
    localStorage.setItem(AUTH_KEY, 'LOGGED_OUT');
    localStorage.removeItem('kisan_auth_user');
  }
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
