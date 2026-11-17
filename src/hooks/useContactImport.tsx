import React, { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Linking } from 'react-native';

import { logContactEvent } from '../services/metevo/contactEvents';
import { ContactImportController } from '../services/metevo/contactImport';
import { listenForContactLinks } from '../services/metevo/contactLinkListener';
import { listContacts, listPendingContacts, rememberContact } from '../services/metevo/contacts';

const ContactImportContext = createContext<ContactImportController | null>(null);

export function ContactImportProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new ContactImportController(
    { listContacts, listPendingContacts, rememberContact },
    Date.now,
    logContactEvent,
  ));
  useEffect(() => listenForContactLinks(Linking, controller.enqueue), [controller]);
  return <ContactImportContext.Provider value={controller}>{children}</ContactImportContext.Provider>;
}

export function useContactImport() {
  const controller = useContext(ContactImportContext);
  if (controller === null) throw new Error('useContactImport needs ContactImportProvider');
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return { controller, ...snapshot };
}
