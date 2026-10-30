import { trainerPayPerClassCentavos } from './trainer-pay';

// The BKO-006 class line (decisions section 8): Bs 65 a class with up to 4
// students, and Bs 8 for each student from the fifth.
const rates = {
  classCentavos: 6_500,
  includedStudents: 4,
  extraStudentCentavos: 800,
};

describe('trainer pay per class', () => {
  it('pays the class rate up to the included students', () => {
    expect(trainerPayPerClassCentavos(rates, 0)).toBe(6_500);
    expect(trainerPayPerClassCentavos(rates, 4)).toBe(6_500);
  });

  it('adds Bs 8 for each student from the fifth', () => {
    expect(trainerPayPerClassCentavos(rates, 5)).toBe(7_300);
    expect(trainerPayPerClassCentavos(rates, 8)).toBe(9_700);
  });
});
