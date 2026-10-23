// A spreadsheet runs a cell that starts with = + - @ as a formula; a phone
// number such as «+591 70011005» stays as typed.
const neutralised = (value: string): string =>
  /^[=@\t\r]/.test(value) || /^[+-](?![\d\s]+$)/.test(value)
    ? `'${value}`
    : value;

const cell = (value: string): string => {
  const safe = neutralised(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/**
 * The admin web's CSV exports (AW35, REL-012): CRLF rows, quoted cells, and a
 * byte-order mark so a spreadsheet reads the accents as UTF-8.
 */
export const toCsv = (rows: readonly (readonly string[])[]): string =>
  `\uFEFF${rows.map((row) => `${row.map(cell).join(",")}\r\n`).join("")}`;
