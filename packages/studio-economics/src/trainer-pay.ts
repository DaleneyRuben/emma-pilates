// FIX-008. The BKO-006 class line (decisions section 8): the class rate with
// up to the included students, plus the extra rate for each student beyond
// them. The backend's payroll (back-office/payroll/trainer-pay.ts) applies
// the same rule to real Sessions with the PayRateRule in force.

export type TrainerPayRates = {
  classCentavos: number;
  includedStudents: number;
  extraStudentCentavos: number;
};

export const trainerPayPerClassCentavos = (
  rates: TrainerPayRates,
  students: number,
): number =>
  rates.classCentavos +
  Math.max(0, students - rates.includedStudents) * rates.extraStudentCentavos;
