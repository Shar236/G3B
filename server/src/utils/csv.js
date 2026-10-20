/** Convert an array of flat objects into a CSV string. */
export function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const raw = value instanceof Date ? value.toISOString() : String(value);
    // Prevent Excel/Sheets from interpreting attacker-controlled cells as formulas.
    const text = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const keys = columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const header = keys.join(',');
  const body = rows.map((row) => keys.map((key) => escape(row[key])).join(',')).join('\r\n');
  return rows.length > 0 ? `${header}\r\n${body}` : header;
}

export default toCsv;
