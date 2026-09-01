import {
  appendEmptyRow,
  appendPdfCell,
  appendTextCell,
} from "./certificate-view.js";

const certTableBody = document.getElementById("certTableBody");
const filterCertificado = document.getElementById("filterCertificado");
const filterProducto = document.getElementById("filterProducto");
const filterMarca = document.getElementById("filterMarca");
const filterModelo = document.getElementById("filterModelo");
const clearFilters = document.getElementById("clearFilters");
let allCertificates = [];

async function loadCertifications() {
  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Respuesta inválida");
    allCertificates = data;
    renderTable();
  } catch (err) {
    console.error("Error cargando certificados:", err);
    certTableBody.replaceChildren();
    appendEmptyRow(certTableBody, 5, "No se pudieron cargar los certificados.");
  }
}

function normalizedField(value) {
  return String(value ?? "").toLowerCase();
}

function renderTable() {
  const certificadoFilter = filterCertificado.value.toLowerCase();
  const productoFilter = filterProducto.value.toLowerCase();
  const marcaFilter = filterMarca.value.toLowerCase();
  const modeloFilter = filterModelo.value.toLowerCase();

  certTableBody.replaceChildren();

  const filtered = allCertificates
    .filter(
      (cert) =>
        normalizedField(cert.producto).includes(productoFilter) &&
        normalizedField(cert.marca).includes(marcaFilter) &&
        normalizedField(cert.certificado).includes(certificadoFilter) &&
        normalizedField(cert.modelo).includes(modeloFilter)
    );

  if (!filtered.length) {
    appendEmptyRow(certTableBody, 5, "No se encontraron resultados.");
    return;
  }

  filtered.forEach((cert) => {
    const row = document.createElement("tr");
    appendTextCell(row, cert.certificado);
    appendTextCell(row, cert.producto);
    appendTextCell(row, cert.marca);
    appendTextCell(row, cert.modelo);
    appendPdfCell(row, cert.pdf_url, "No cargado");
    certTableBody.appendChild(row);
  });
}

[filterProducto, filterMarca, filterModelo, filterCertificado].forEach((input) => {
  input.addEventListener("input", renderTable);
});
clearFilters.addEventListener("click", () => {
  filterProducto.value = "";
  filterMarca.value = "";
  filterModelo.value = "";
  filterCertificado.value = "";
  renderTable();
});

loadCertifications();


