/**
 * Firestore Service for Household Services
 * Handles all CRUD operations for services, price history, quantity history, and overrides
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { firestore, firebaseAuth } from '../../config/firebase';
import {
  HouseholdService,
  PriceHistoryEntry,
  QuantityHistoryEntry,
  DailyOverride,
  CreateServiceRequest,
  UpdateServiceRequest,
  AddPriceHistoryRequest,
  AddQuantityHistoryRequest,
  AddDailyOverrideRequest,
} from '../../types/householdServices';

// Collection names
const COLLECTIONS = {
  SERVICES: 'householdServices',
  PRICE_HISTORY: 'householdServicePriceHistory',
  QUANTITY_HISTORY: 'householdServiceQuantityHistory',
  DAILY_OVERRIDES: 'householdServiceDailyOverrides',
} as const;

/**
 * Convert text to Title Case (first letter of each word capitalized)
 */
function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

/**
 * Convert Firestore document to HouseholdService
 */
function docToService(docData: any, id: string): HouseholdService {
  return {
    id,
    userId: docData.userId,
    name: docData.name,
    billingType: docData.billingType,
    defaultQuantity: docData.defaultQuantity,
    unit: docData.unit,
    monthlySalary: docData.monthlySalary,
    allowedLeaves: docData.allowedLeaves,
    isActive: docData.isActive ?? true,
    startDate: (docData.startDate as Timestamp)?.toDate() ?? undefined,
    createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
    order: docData.order ?? 0,
  };
}

/**
 * Convert Firestore document to PriceHistoryEntry
 */
function docToPriceHistory(docData: any, id: string): PriceHistoryEntry {
  return {
    id,
    serviceId: docData.serviceId,
    userId: docData.userId,
    price: docData.price,
    effectiveDate: (docData.effectiveDate as Timestamp)?.toDate() ?? new Date(),
    createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? undefined,
  };
}

/**
 * Convert Firestore document to QuantityHistoryEntry
 */
function docToQuantityHistory(docData: any, id: string): QuantityHistoryEntry {
  return {
    id,
    serviceId: docData.serviceId,
    userId: docData.userId,
    quantity: docData.quantity,
    effectiveDate: (docData.effectiveDate as Timestamp)?.toDate() ?? new Date(),
    createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? undefined,
  };
}

/**
 * Convert Firestore document to DailyOverride
 */
function docToDailyOverride(docData: any, id: string): DailyOverride {
  return {
    id,
    serviceId: docData.serviceId,
    userId: docData.userId,
    date: (docData.date as Timestamp)?.toDate() ?? new Date(),
    overrideType: docData.overrideType,
    quantity: docData.quantity,
    createdAt: (docData.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (docData.updatedAt as Timestamp)?.toDate() ?? new Date(),
  };
}


/**
 * Get current user ID
 */
function getCurrentUserId(): string {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }
  return user.uid;
}

// ==================== Services ====================

/**
 * Get all services for the current user
 */
export async function getServices(): Promise<HouseholdService[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(firestore, COLLECTIONS.SERVICES),
    where('userId', '==', userId),
    orderBy('order', 'asc'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToService(doc.data(), doc.id));
}

/**
 * Subscribe to services changes
 */
export function subscribeToServices(
  callback: (services: HouseholdService[]) => void
): Unsubscribe {
  const userId = getCurrentUserId();
  const q = query(
    collection(firestore, COLLECTIONS.SERVICES),
    where('userId', '==', userId),
    orderBy('order', 'asc'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, snapshot => {
    const services = snapshot.docs.map(doc => docToService(doc.data(), doc.id));
    callback(services);
  });
}

/**
 * Get a single service by ID
 */
export async function getService(serviceId: string): Promise<HouseholdService | null> {
  const userId = getCurrentUserId();
  const docRef = doc(firestore, COLLECTIONS.SERVICES, serviceId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  if (data.userId !== userId) {
    throw new Error('Service not found or access denied');
  }

  return docToService(data, docSnap.id);
}

/**
 * Create a new service
 */
export async function createService(data: CreateServiceRequest): Promise<string> {
  const userId = getCurrentUserId();
  const now = Timestamp.now();

  // Get current max order
  const services = await getServices();
  const maxOrder = services.length > 0 
    ? Math.max(...services.map(s => s.order || 0))
    : 0;

  const serviceData: any = {
    userId,
    name: toTitleCase(data.name),
    billingType: data.billingType,
    isActive: true,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  // Only add optional fields if they are defined
  if (data.defaultQuantity !== undefined) {
    serviceData.defaultQuantity = data.defaultQuantity;
  }
  if (data.unit !== undefined) {
    serviceData.unit = data.unit;
  }
  if (data.monthlySalary !== undefined) {
    serviceData.monthlySalary = data.monthlySalary;
  }
  if (data.allowedLeaves !== undefined) {
    serviceData.allowedLeaves = data.allowedLeaves;
  }
  if (data.startDate !== undefined) {
    serviceData.startDate = Timestamp.fromDate(new Date(data.startDate));
  }

  const docRef = await addDoc(
    collection(firestore, COLLECTIONS.SERVICES),
    serviceData
  );

  return docRef.id;
}

/**
 * Update a service
 */
export async function updateService(
  serviceId: string,
  data: UpdateServiceRequest
): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(firestore, COLLECTIONS.SERVICES, serviceId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Service not found');
  }

  const serviceData = docSnap.data();
  if (serviceData.userId !== userId) {
    throw new Error('Access denied');
  }

  const updateData: any = {
    updatedAt: Timestamp.now(),
  };

  if (data.name !== undefined) updateData.name = toTitleCase(data.name);
  if (data.defaultQuantity !== undefined) updateData.defaultQuantity = data.defaultQuantity;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.monthlySalary !== undefined) updateData.monthlySalary = data.monthlySalary;
  if (data.allowedLeaves !== undefined) updateData.allowedLeaves = data.allowedLeaves;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.startDate !== undefined) {
    updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
  }

  await updateDoc(docRef, updateData);
}

/**
 * Delete a service
 */
export async function deleteService(serviceId: string): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(firestore, COLLECTIONS.SERVICES, serviceId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Service not found');
  }

  const serviceData = docSnap.data();
  if (serviceData.userId !== userId) {
    throw new Error('Access denied');
  }

  await deleteDoc(docRef);
}

// ==================== Price History ====================

/**
 * Get price history for a service
 */
export async function getPriceHistory(serviceId: string): Promise<PriceHistoryEntry[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(firestore, COLLECTIONS.PRICE_HISTORY),
    where('serviceId', '==', serviceId),
    where('userId', '==', userId),
    orderBy('effectiveDate', 'desc')
  );

  const snapshot = await getDocs(q);
  const history = snapshot.docs.map(doc => docToPriceHistory(doc.data(), doc.id));
  return history;
}

/**
 * Subscribe to price history changes
 */
export function subscribeToPriceHistory(
  serviceId: string,
  callback: (history: PriceHistoryEntry[]) => void
): Unsubscribe {
  const userId = getCurrentUserId();
  const q = query(
    collection(firestore, COLLECTIONS.PRICE_HISTORY),
    where('serviceId', '==', serviceId),
    where('userId', '==', userId),
    orderBy('effectiveDate', 'desc')
  );

  return onSnapshot(q, snapshot => {
    const history = snapshot.docs.map(doc => docToPriceHistory(doc.data(), doc.id));
    callback(history);
  });
}

/**
 * Add or update price history entry
 * If an entry exists for the same effective date, it will be updated instead of creating a new one
 */
export async function addPriceHistory(data: AddPriceHistoryRequest): Promise<string> {
  const userId = getCurrentUserId();
  const now = Timestamp.now();
  const effectiveDate = Timestamp.fromDate(new Date(data.effectiveDate));

  // Check if an entry already exists for this service and effective date
  const existingQuery = query(
    collection(firestore, COLLECTIONS.PRICE_HISTORY),
    where('serviceId', '==', data.serviceId),
    where('userId', '==', userId),
    where('effectiveDate', '==', effectiveDate)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    // Update existing entry
    const existingDoc = existingSnapshot.docs[0];
    await updateDoc(existingDoc.ref, {
      price: data.price,
      updatedAt: now,
    });
    return existingDoc.id;
  } else {
    // Create new entry
    const historyData = {
      serviceId: data.serviceId,
      userId,
      price: data.price,
      effectiveDate,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(
      collection(firestore, COLLECTIONS.PRICE_HISTORY),
      historyData
    );

    return docRef.id;
  }
}

// ==================== Quantity History ====================

/**
 * Get quantity history for a service
 */
export async function getQuantityHistory(serviceId: string): Promise<QuantityHistoryEntry[]> {
  const userId = getCurrentUserId();
  const q = query(
    collection(firestore, COLLECTIONS.QUANTITY_HISTORY),
    where('serviceId', '==', serviceId),
    where('userId', '==', userId),
    orderBy('effectiveDate', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToQuantityHistory(doc.data(), doc.id));
}

/**
 * Subscribe to quantity history changes
 */
export function subscribeToQuantityHistory(
  serviceId: string,
  callback: (history: QuantityHistoryEntry[]) => void
): Unsubscribe {
  const userId = getCurrentUserId();
  const q = query(
    collection(firestore, COLLECTIONS.QUANTITY_HISTORY),
    where('serviceId', '==', serviceId),
    where('userId', '==', userId),
    orderBy('effectiveDate', 'desc')
  );

  return onSnapshot(q, snapshot => {
    const history = snapshot.docs.map(doc => docToQuantityHistory(doc.data(), doc.id));
    callback(history);
  });
}

/**
 * Add or update quantity history entry
 * If an entry exists for the same effective date, it will be updated instead of creating a new one
 */
export async function addQuantityHistory(data: AddQuantityHistoryRequest): Promise<string> {
  const userId = getCurrentUserId();
  const now = Timestamp.now();
  const effectiveDate = Timestamp.fromDate(new Date(data.effectiveDate));

  // Check if an entry already exists for this service and effective date
  const existingQuery = query(
    collection(firestore, COLLECTIONS.QUANTITY_HISTORY),
    where('serviceId', '==', data.serviceId),
    where('userId', '==', userId),
    where('effectiveDate', '==', effectiveDate)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    // Update existing entry
    const existingDoc = existingSnapshot.docs[0];
    await updateDoc(existingDoc.ref, {
      quantity: data.quantity,
      updatedAt: now,
    });
    return existingDoc.id;
  } else {
    // Create new entry
    const historyData = {
      serviceId: data.serviceId,
      userId,
      quantity: data.quantity,
      effectiveDate,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(
      collection(firestore, COLLECTIONS.QUANTITY_HISTORY),
      historyData
    );

    return docRef.id;
  }
}

// ==================== Daily Overrides ====================

/**
 * Get all daily overrides for a date range
 */
export async function getDailyOverrides(
  startDate: Date,
  endDate: Date
): Promise<DailyOverride[]> {
  const userId = getCurrentUserId();
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(firestore, COLLECTIONS.DAILY_OVERRIDES),
    where('userId', '==', userId),
    where('date', '>=', startTimestamp),
    where('date', '<=', endTimestamp),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToDailyOverride(doc.data(), doc.id));
}

/**
 * Subscribe to daily overrides changes
 */
export function subscribeToDailyOverrides(
  startDate: Date,
  endDate: Date,
  callback: (overrides: DailyOverride[]) => void
): Unsubscribe {
  const userId = getCurrentUserId();
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    collection(firestore, COLLECTIONS.DAILY_OVERRIDES),
    where('userId', '==', userId),
    where('date', '>=', startTimestamp),
    where('date', '<=', endTimestamp),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, snapshot => {
    const overrides = snapshot.docs.map(doc => docToDailyOverride(doc.data(), doc.id));
    callback(overrides);
  });
}

/**
 * Add or update daily override
 */
export async function addDailyOverride(data: AddDailyOverrideRequest): Promise<string> {
  const userId = getCurrentUserId();
  const now = Timestamp.now();
  
  // Import timezone service dynamically to avoid circular dependencies
  const { parseDateInTimezone, formatDateForComparison: formatDateTZ } = await import('../timezoneService');
  
  // Parse date string (YYYY-MM-DD) in user's timezone
  const overrideDateLocal = await parseDateInTimezone(data.date);
  const overrideDate = Timestamp.fromDate(overrideDateLocal);

  // Check if override already exists for this date and service
  const startDate = new Date(overrideDateLocal);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(overrideDateLocal);
  endDate.setHours(23, 59, 59);
  
  const existingOverrides = await getDailyOverrides(startDate, endDate);
  const targetDateStr = await formatDateTZ(overrideDateLocal);
  
  // Check each override synchronously using formatDateForComparison from this file
  // (which uses local timezone, matching the timezone service behavior)
  const existing = existingOverrides.find(
    o => o.serviceId === data.serviceId && 
         formatDateForComparison(o.date) === formatDateForComparison(overrideDateLocal)
  );

  if (existing) {
    // Update existing override
    const docRef = doc(firestore, COLLECTIONS.DAILY_OVERRIDES, existing.id);
    const updateData: any = {
      overrideType: data.overrideType,
      updatedAt: now,
    };
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }
    await updateDoc(docRef, updateData);
    return existing.id;
  } else {
    // Create new override
    const overrideData: any = {
      serviceId: data.serviceId,
      userId,
      date: overrideDate,
      overrideType: data.overrideType,
      createdAt: now,
      updatedAt: now,
    };
    // Only add quantity if provided
    if (data.quantity !== undefined && data.quantity !== null) {
      overrideData.quantity = data.quantity;
    }

    const docRef = await addDoc(
      collection(firestore, COLLECTIONS.DAILY_OVERRIDES),
      overrideData
    );
    return docRef.id;
  }
}

/**
 * Delete daily override
 */
export async function deleteDailyOverride(overrideId: string): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(firestore, COLLECTIONS.DAILY_OVERRIDES, overrideId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Override not found');
  }

  const overrideData = docSnap.data();
  if (overrideData.userId !== userId) {
    throw new Error('Access denied');
  }

  await deleteDoc(docRef);
}

// Helper function
function formatDateForComparison(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
