import { useEffect, useState } from 'react';

import { JournalEntry, listPayments } from '../services/metevo/paymentJournal';

/** The journal as it is when the card opens; null while it loads. */
export function usePaymentJournal(): JournalEntry[] | null {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    void listPayments().then((loaded) => {
      if (alive) {
        setEntries(loaded);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return entries;
}
