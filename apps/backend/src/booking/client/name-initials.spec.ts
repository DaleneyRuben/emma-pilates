import { nameInitials } from './name-initials';

describe('nameInitials', () => {
  it('takes the first letter of the first two names, upper case', () => {
    expect(nameInitials('valeria quispe rojas')).toBe('VQ');
  });

  it('keeps one letter for a single name and ignores extra spaces', () => {
    expect(nameInitials('  Lucía  ')).toBe('L');
  });

  it('keeps accented letters', () => {
    expect(nameInitials('Úrsula Ñique')).toBe('ÚÑ');
  });
});
