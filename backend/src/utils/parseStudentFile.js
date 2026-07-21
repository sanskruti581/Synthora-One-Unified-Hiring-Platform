import readXlsxFile from "read-excel-file/node";
import { parse as parseCsv } from "csv-parse/sync";

const emailKeys = ["email", "mail", "email id", "email address", "student email"];
const nameKeys = ["name", "student name", "full name"];
const phoneKeys = ["phone", "mobile", "phone number", "contact"];

function pickValue(row, keys) {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]),
  );

  const matchedKey = keys.find((key) => normalizedRow[key] !== undefined);
  return matchedKey ? String(normalizedRow[matchedKey]).trim() : "";
}

function rowsFromTable(table) {
  if (!Array.isArray(table)) {
    throw new Error("Unable to read student file. Please upload a valid .xlsx or .csv file.");
  }

  if (table.length > 0 && !Array.isArray(table[0]) && typeof table[0] === "object" && table[0] !== null) {
    return table;
  }

  const [headerRow = [], ...dataRows] = table;
  if (!Array.isArray(headerRow)) {
    throw new Error("Student file header row is invalid. Please check the uploaded spreadsheet format.");
  }

  const headers = headerRow.map((header) => String(header).trim());

  return dataRows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, Array.isArray(row) ? (row[index] ?? "") : ""])),
  );
}

export async function parseStudentFile(buffer, filename = "") {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const rows = isCsv ? parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) : rowsFromTable(await readXlsxFile(buffer));

  return rows
    .map((row) => ({
      name: pickValue(row, nameKeys),
      email: pickValue(row, emailKeys).toLowerCase(),
      phone: pickValue(row, phoneKeys),
    }))
    .filter((student) => student.email.includes("@"));
}
