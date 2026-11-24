import { createContext, useContext } from "react";

const InInvoicePanelContext = createContext(false);

/** Marks the invoice drawn in Mis facturas' tablet panel (17T) rather than pushed. */
export const InInvoicePanel = InInvoicePanelContext.Provider;

export function useInInvoicePanel(): boolean {
  return useContext(InInvoicePanelContext);
}
