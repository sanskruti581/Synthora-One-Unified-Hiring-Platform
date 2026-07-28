import readXlsxFile from "read-excel-file/node";
import { parse as parseCsv } from "csv-parse/sync";

const emailKeys = ["email", "mail", "emailid", "emailaddress", "studentemail", "studentmail"];
const nameKeys = ["name", "studentname", "fullname"];
const phoneKeys = ["phone", "mobile", "phonenumber", "contact", "contactnumber"];
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const emailGlobalPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

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

function extractEmails(value) {
  return [...String(value ?? "").matchAll(emailGlobalPattern)].map((match) => match[0].toLowerCase());
}

function pickValue(row, keys) {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
  );

  const matchedKey = keys.find((key) => normalizedRow[key] !== undefined);
  return matchedKey ? String(normalizedRow[matchedKey]).trim() : "";
}

function nearestTextValue(values, startIndex) {
  for (let offset = 1; offset < values.length; offset += 1) {
    const left = values[startIndex - offset];
    const right = values[startIndex + offset];

    if (left && !extractEmail(left)) {
      return left;
    }

    if (right && !extractEmail(right)) {
      return right;
    }
  }

  return "";
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

  const headerCounts = new Map();
  const headers = headerRow.map((header, index) => {
    const baseHeader = String(header ?? "").trim() || `Column ${index + 1}`;
    const normalizedHeader = normalizeKey(baseHeader);
    const count = (headerCounts.get(normalizedHeader) || 0) + 1;
    headerCounts.set(normalizedHeader, count);

    return count === 1 ? baseHeader : `${baseHeader} ${count}`;
  });

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
    const emailEntries = values.flatMap((value, index) => extractEmails(value).map((email) => ({ email, index })));

    if (emailEntries.length === 0) {
      continue;
    }

    for (const { email, index: emailIndex } of emailEntries) {
      const sameCellName = values[emailIndex].replace(emailPattern, "").replace(/[-_:|,;]/g, " ").trim();
      const adjacentName = nearestTextValue(values, emailIndex);
      const name = adjacentName || sameCellName;

      students.push({
        name,
        email,
        phone: "",
      });
    }
  }

  return students;
}

function dedupeStudents(students) {
  const studentByEmail = new Map();

  for (const student of students) {
    if (!isValidEmail(student.email)) {
      continue;
    }

    const existing = studentByEmail.get(student.email);

    studentByEmail.set(student.email, {
      name: existing?.name || student.name || "",
      email: student.email,
      phone: existing?.phone || student.phone || "",
    });
  }

  return [...studentByEmail.values()];
}

export async function parseStudentFile(buffer, filename = "") {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const table = isCsv ? parseCsv(buffer, { skip_empty_lines: true, trim: true }) : await readXlsxFile(buffer);
  const rows = rowsFromTable(table);
  const students = dedupeStudents([...studentsFromRows(rows), ...studentsFromRawValues(table)]);

  if (students.length > 0) {
    return students;
  }

  return studentsFromRawValues(table);
}
