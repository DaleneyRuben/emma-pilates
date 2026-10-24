import { weeklyClassesLeftLine } from './weekly-cap-copy';

// Decisions §2.3: «Te quedan N clases esta semana». Nothing when there is no
// cap. At the cap the line stays at zero; the extra-class line is separate.
describe('weeklyClassesLeftLine', () => {
  it('names the classes left this week', () => {
    expect(weeklyClassesLeftLine(3)).toBe('Te quedan 3 clases esta semana');
    expect(weeklyClassesLeftLine(1)).toBe('Te queda 1 clase esta semana');
    expect(weeklyClassesLeftLine(0)).toBe('Te quedan 0 clases esta semana');
  });

  it('says nothing when the Plan has no cap', () => {
    expect(weeklyClassesLeftLine(null)).toBeNull();
  });
});
