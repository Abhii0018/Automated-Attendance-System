export const ALLOWED_SEMESTERS = [1];
export const ALLOWED_SECTIONS = ["PA", "PB"];
export const ALLOWED_SUBJECTS = [
  "Math",
  "C Language",
  "DBMS",
  "English",
  "Networking",
];

export const isAllowedSemester = (semester) =>
  ALLOWED_SEMESTERS.includes(Number(semester));

export const normalizeSection = (section = "") =>
  String(section).trim().toUpperCase();

export const normalizeSubject = (subject = "") =>
  String(subject).trim();
