import { countFormat } from "../../components/table/pagination";

// Supplies are counted in whole units (BKO-001 D3), as AW31 writes them.
export const unitsLabel = (quantity: number) =>
  `${countFormat.format(quantity)} unid.`;
