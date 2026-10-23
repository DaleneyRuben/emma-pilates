export type InvoiceData = { taxId: string; name: string };

export type InvoiceChoice = {
  wantsInvoice: boolean;
  taxId: string;
  name: string;
  prefilled: boolean;
};

const notYet = (): never => {
  throw new Error("Not implemented");
};

export const invoiceChoiceFrom: (prefill: InvoiceData | null) => InvoiceChoice = notYet;

export const invoiceDataPayload: (choice: InvoiceChoice) => InvoiceData | null | "incomplete" =
  notYet;

export const InvoiceDataCard: (props: {
  value: InvoiceChoice;
  onChange: (choice: InvoiceChoice) => void;
  noInvoiceNote: string;
  prefilledNote: string;
}) => null = notYet;
