export const weeklyClassesLeftLine = (
  classesLeftThisWeek: number | null,
): string | null => {
  if (classesLeftThisWeek === null) return null;
  if (classesLeftThisWeek === 1) return 'Te queda 1 clase esta semana';
  return `Te quedan ${classesLeftThisWeek} clases esta semana`;
};
