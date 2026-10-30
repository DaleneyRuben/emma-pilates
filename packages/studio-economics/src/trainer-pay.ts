export type TrainerPayRates = {
  classCentavos: number;
  includedStudents: number;
  extraStudentCentavos: number;
};

export const trainerPayPerClassCentavos = (
  rates: TrainerPayRates,
  students: number,
): number => rates.classCentavos;
