const CERTIFICATE_PDF_ORIGIN = "https://guhycosuznmmmupsztqn.supabase.co";
const CERTIFICATE_PDF_PATH_PREFIX = "/storage/v1/object/public/pdfs/";

export function normalizeCertificatePdfUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return "";
  }

  if (
    url.protocol !== "https:" ||
    url.origin !== CERTIFICATE_PDF_ORIGIN ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(CERTIFICATE_PDF_PATH_PREFIX)
  ) {
    return "";
  }

  return url.toString();
}

export function appendTextCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = String(value ?? "");
  row.appendChild(cell);
  return cell;
}

export function appendPdfCell(row, value, emptyLabel) {
  const cell = document.createElement("td");
  const safeUrl = normalizeCertificatePdfUrl(value);

  if (safeUrl) {
    const link = document.createElement("a");
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Ver PDF";
    cell.appendChild(link);
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = emptyLabel;
    cell.appendChild(badge);
  }

  row.appendChild(cell);
  return cell;
}

export function appendEmptyRow(tableBody, columns, message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columns;
  cell.className = "empty-table-message";
  cell.textContent = message;
  row.appendChild(cell);
  tableBody.appendChild(row);
}
