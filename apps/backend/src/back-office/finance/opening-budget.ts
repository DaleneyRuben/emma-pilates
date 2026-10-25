// BKO-005: the owner's opening budget (decisions section 11), in centavos.
export const openingBudgetLines = [
  { name: 'Alquiler', monthlyCentavos: 850_000 },
  { name: 'Coordinadora', monthlyCentavos: 350_000 },
  { name: 'Recepción', monthlyCentavos: 340_000 },
  { name: 'Luz, agua e internet', monthlyCentavos: 60_000 },
  { name: 'Software', monthlyCentavos: 15_000 },
  { name: 'Limpieza', monthlyCentavos: 80_000 },
  { name: 'Contador', monthlyCentavos: 80_000 },
  { name: 'Mantenimiento', monthlyCentavos: 10_000 },
  { name: 'Anuncios', monthlyCentavos: 100_000 },
  { name: 'Insumos', monthlyCentavos: 40_000 },
] as const;

export const contingencyPercent = 10;
