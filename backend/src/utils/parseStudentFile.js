import readXlsxFile from "read-excel-file/node";
import { parse as parseCsv } from "csv-parse/sync";

const emailKeys = ["email", "mail", "emailid", "emailaddress", "studentemail", "studentmail"];
const nameKeys = ["name", "studentname", "fullname"];
const phoneKeys = ["phone", "mobile", "phonenumber", "contact", "contactnumber"];
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function normalizeKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractEmail(value) {
  const match = String(value ?? "").match(emailPattern);
  return match ? match[0].toLowerCase() : "";
}

function pickValue(row, keys) {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
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

  const headers = headerRow.map((header) => String(header ?? "").trim());

  return dataRows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, Array.isArray(row) ? (row[index] ?? "") : ""])),
  );
}

function studentsFromRows(rows) {
  return rows.flatMap((row) => {
    const pickedEmail = pickValue(row, emailKeys).toLowerCase();
    const email = isValidEmail(pickedEmail) ? pickedEmail : extractEmail(Object.values(row).join(" "));

    if (!isValidEmail(email)) {
      return [];
    }

    return [{
      name: pickValue(row, nameKeys),
      email,
      phone: pickValue(row, phoneKeys),
    }];
  });
}

function studentsFromRawValues(rawRows) {
  const students = [];

  for (const row of rawRows) {
    const values = Array.isArray(row)
      ? row.map((value) => String(value ?? "").trim())
      : Object.values(row).map((value) => String(value ?? "").trim());
    const emailIndex = values.findIndex((value) => extractEmail(value));

    if (emailIndex === -1) {
      continue;
    }

    const email = extractEmail(values[emailIndex]);
    const sameCellName = values[emailIndex].replace(emailPattern, "").replace(/[-_:|,;]/g, " ").trim();
    const adjacentName = values.find((value, index) => index !== emailIndex && value && !extractEmail(value)) || "";
    const name = adjacentName || sameCellName;

    students.push({
      name,
      email,
      phone: "",
    });
  }

  return students;
}

export async function parseStudentFile(buffer, filename = "") {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const table = isCsv ? null : await readXlsxFile(buffer);
  const rows = isCsv ? parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) : rowsFromTable(table);
  const students = studentsFromRows(rows);

  if (students.length > 0) {
    return students;
  }

  return isCsv ? studentsFromRawValues(rows) : studentsFromRawValues(table);
}
