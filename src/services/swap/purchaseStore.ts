import * as SecureStore from 'expo-secure-store';
import { PurchaseOrder, PurchaseStore, UsdmPurchaseLedger, validOrder } from './usdmPurchase';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const CHUNK = 1500;
let generation = 0;
const ledgers = new Map<string, UsdmPurchaseLedger>();

/** Chunks stay below SecureStore's per-value budget. Publish the head only after
 * every chunk is durable, so a killed app never reads a half-written order. */
export function createPurchaseStore(scope: string): PurchaseStore {
  if (!/^[a-zA-Z0-9._-]+$/.test(scope)) throw new Error('invalid purchase wallet scope');
  const prefix = `metevo.purchase.${scope}`;
  return {
    async load() {
      const rawHead = await SecureStore.getItemAsync(`${prefix}.head`, options);
      if (rawHead === null) return [];
      const head = JSON.parse(rawHead);
      if (typeof head.id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(head.id) || !Number.isSafeInteger(head.count) || head.count < 1) throw new Error('invalid purchase store head');
      const parts = await Promise.all(Array.from({ length: head.count }, (_, i) => SecureStore.getItemAsync(`${prefix}.${head.id}.${i}`, options)));
      if (parts.some((part) => part === null)) throw new Error('incomplete purchase store');
      const orders: unknown = JSON.parse(parts.join(''));
      if (!Array.isArray(orders) || !orders.every(validOrder)) throw new Error('invalid purchase store');
      return orders;
    },
    async save(orders: PurchaseOrder[]) {
      const oldRaw = await SecureStore.getItemAsync(`${prefix}.head`, options);
      const old = oldRaw === null ? null : JSON.parse(oldRaw);
      const raw = JSON.stringify(orders);
      const id = `${Date.now()}-${++generation}`;
      const count = Math.ceil(raw.length / CHUNK);
      for (let i = 0; i < count; i++) await SecureStore.setItemAsync(`${prefix}.${id}.${i}`, raw.slice(i * CHUNK, (i + 1) * CHUNK), options);
      await SecureStore.setItemAsync(`${prefix}.head`, JSON.stringify({ id, count }), options);
      // Cleanup follows publication. A cleanup failure cannot undo a committed order.
      if (old && typeof old.id === 'string' && Number.isSafeInteger(old.count)) {
        for (let i = 0; i < old.count; i++) await SecureStore.deleteItemAsync(`${prefix}.${old.id}.${i}`, options).catch(() => {});
      }
    },
  };
}
export function purchaseLedgerFor(scope: string): UsdmPurchaseLedger {
  let ledger = ledgers.get(scope);
  if (!ledger) { ledger = new UsdmPurchaseLedger(createPurchaseStore(scope)); ledgers.set(scope, ledger); }
  return ledger;
}
