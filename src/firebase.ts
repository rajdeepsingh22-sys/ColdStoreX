import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { Farmer, Chamber, InwardEntry, OutwardEntry } from './types';
import { INITIAL_CHAMBERS } from './utils/storage';

// Web app's Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyBLNVpv9-oWRfueJy5IQR5lbDkp76fSamM",
  authDomain: "coldstorex-3b.firebaseapp.com",
  projectId: "coldstorex-3b",
  storageBucket: "coldstorex-3b.firebasestorage.app",
  messagingSenderId: "582785199197",
  appId: "1:582785199197:web:c5b498c1833032f74771b4",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Firestore Collections
export const COLLECTIONS = {
  FARMERS: 'farmers',
  CHAMBERS: 'chambers',
  INWARDS: 'inwards',
  OUTWARDS: 'outwards',
  USERS: 'users',
  SETTINGS: 'settings',
};

export interface SyncStatus {
  status: 'connected' | 'connecting' | 'error' | 'offline';
  message?: string;
  lastSynced?: Date;
}

/**
 * Validate Connection to Cloud Firestore
 */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true };
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('offline') || msg.includes('network')) {
      return { ok: false, error: 'Offline / No Internet' };
    }
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      return { ok: false, error: 'Permission Denied: Please check Firestore Rules in Firebase Console' };
    }
    // If it's not found or another non-fatal response, the connection is healthy
    return { ok: true };
  }
}

/**
 * Sign in using Firebase Auth with graceful fallback
 */
export async function loginWithFirebase(email: string, pass: string): Promise<boolean> {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
    return true;
  } catch (err) {
    console.warn('Firebase auth attempt returned:', err);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign out
 */
export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut:', e);
  }
}

/**
 * Auth state listener
 */
export function onFirebaseAuthStateChange(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Seed initial chambers into Firestore if chambers collection is empty
 */
export async function seedInitialChambers(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTIONS.CHAMBERS);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const ch of INITIAL_CHAMBERS) {
        const docRef = doc(db, COLLECTIONS.CHAMBERS, ch.id);
        batch.set(docRef, ch);
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not seed initial chambers to Firestore:', err);
  }
}

/**
 * Real-time listener for Chambers
 */
export function subscribeToChambers(
  onUpdate: (chambers: Chamber[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.CHAMBERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        seedInitialChambers();
        onUpdate(INITIAL_CHAMBERS);
        return;
      }
      const list: Chamber[] = [];
      snapshot.forEach((d) => list.push(d.data() as Chamber));
      list.sort((a, b) => a.id.localeCompare(b.id));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore chambers subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for Farmers
 */
export function subscribeToFarmers(
  onUpdate: (farmers: Farmer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.FARMERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Farmer[] = [];
      snapshot.forEach((d) => list.push(d.data() as Farmer));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore farmers subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for Inwards (Potato Lots)
 */
export function subscribeToInwards(
  onUpdate: (inwards: InwardEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.INWARDS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: InwardEntry[] = [];
      snapshot.forEach((d) => list.push(d.data() as InwardEntry));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore inwards subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for Outwards (Dispatches & Gate Passes)
 */
export function subscribeToOutwards(
  onUpdate: (outwards: OutwardEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.OUTWARDS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: OutwardEntry[] = [];
      snapshot.forEach((d) => list.push(d.data() as OutwardEntry));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore outwards subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for Users (Staff & Friends)
 */
export function subscribeToUsers(
  onUpdate: (users: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.USERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((d) => list.push(d.data()));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore users subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Helper to strip any undefined values that cause Firestore to reject writes
 */
function cleanForFirestore<T>(data: T): any {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Save User to Firestore
 */
export async function saveUserToFirestore(user: any): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), cleanForFirestore(user), { merge: true });
    return true;
  } catch (err) {
    console.warn('Error saving user to Firestore:', err);
    return false;
  }
}

/**
 * Delete User from Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    return true;
  } catch (err) {
    console.warn('Error deleting user from Firestore:', err);
    return false;
  }
}

/**
 * Save new Farmer to Firestore
 */
export async function saveFarmerToFirestore(farmer: Farmer): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, COLLECTIONS.FARMERS, farmer.id), cleanForFirestore(farmer), { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn('Error saving farmer to Firestore:', err);
    return { success: false, error: err?.message || 'Firestore write failed' };
  }
}

/**
 * Save Inward Batch to Firestore with atomic chamber updates
 */
export async function saveInwardBatchToFirestore(
  inwards: InwardEntry[],
  updatedChambers: Chamber[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);

    for (const item of inwards) {
      const docRef = doc(db, COLLECTIONS.INWARDS, item.id);
      batch.set(docRef, cleanForFirestore(item), { merge: true });
    }

    for (const ch of updatedChambers) {
      const chRef = doc(db, COLLECTIONS.CHAMBERS, ch.id);
      batch.set(chRef, cleanForFirestore({ currentBags: ch.currentBags }), { merge: true });
    }

    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.warn('Error saving inward batch to Firestore:', err);
    return { success: false, error: err?.message || 'Firestore write failed' };
  }
}

/**
 * Save Outward Entry to Firestore with atomic inward & chamber updates
 */
export async function saveOutwardToFirestore(
  outward: OutwardEntry,
  updatedInward?: InwardEntry,
  updatedChamber?: Chamber
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);

    const outRef = doc(db, COLLECTIONS.OUTWARDS, outward.id);
    batch.set(outRef, cleanForFirestore(outward), { merge: true });

    if (updatedInward) {
      const inwRef = doc(db, COLLECTIONS.INWARDS, updatedInward.id);
      batch.set(inwRef, cleanForFirestore({ remainingBags: updatedInward.remainingBags }), { merge: true });
    }

    if (updatedChamber) {
      const chRef = doc(db, COLLECTIONS.CHAMBERS, updatedChamber.id);
      batch.set(chRef, cleanForFirestore({ currentBags: updatedChamber.currentBags }), { merge: true });
    }

    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.warn('Error saving outward to Firestore:', err);
    return { success: false, error: err?.message || 'Firestore write failed' };
  }
}

/**
 * Sync ALL data from current local state to Cloud Firestore.
 * This guarantees that existing data on this device is immediately written to Firestore
 * and becomes visible to every other device!
 */
export async function syncAllToFirestore(appState: any): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const batch = writeBatch(db);
    let count = 0;

    // 1. Sync Farmers
    if (appState.farmers && appState.farmers.length > 0) {
      for (const farmer of appState.farmers) {
        batch.set(doc(db, COLLECTIONS.FARMERS, farmer.id), cleanForFirestore(farmer), { merge: true });
        count++;
      }
    }

    // 2. Sync Chambers
    if (appState.chambers && appState.chambers.length > 0) {
      for (const chamber of appState.chambers) {
        batch.set(doc(db, COLLECTIONS.CHAMBERS, chamber.id), cleanForFirestore(chamber), { merge: true });
        count++;
      }
    }

    // 3. Sync Inwards
    if (appState.inwards && appState.inwards.length > 0) {
      for (const inward of appState.inwards) {
        batch.set(doc(db, COLLECTIONS.INWARDS, inward.id), cleanForFirestore(inward), { merge: true });
        count++;
      }
    }

    // 4. Sync Outwards
    if (appState.outwards && appState.outwards.length > 0) {
      for (const outward of appState.outwards) {
        batch.set(doc(db, COLLECTIONS.OUTWARDS, outward.id), cleanForFirestore(outward), { merge: true });
        count++;
      }
    }

    // 5. Sync Users
    if (appState.users && appState.users.length > 0) {
      for (const user of appState.users) {
        batch.set(doc(db, COLLECTIONS.USERS, user.id), cleanForFirestore(user), { merge: true });
        count++;
      }
    }

    // 6. Sync Settings
    batch.set(
      doc(db, COLLECTIONS.SETTINGS, 'general'),
      cleanForFirestore({
        defaultRatePerBag: appState.defaultRatePerBag || 160,
        coldStorageName: appState.coldStorageName || 'ColdStoreX',
        contactPhone: appState.contactPhone || '9876543210',
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    count++;

    await batch.commit();
    return { success: true, count };
  } catch (err: any) {
    console.error('Error syncing all data to Firestore:', err);
    return { success: false, count: 0, error: err?.message || 'Firestore write failed' };
  }
}
