// js/main.js

const resultsTableBody = document.getElementById("resultsTableBody");
const searchProducto = document.getElementById("searchProducto");
const searchModelo = document.getElementById("searchModelo");

let allCertificates = [];

// Cargar certificados desde backend
async function loadCertificates() {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates");
  allCertificates = await res.json();
  renderTable(allCertificates);
}

// Renderizar tabla según datos filtrados
function renderTable(certificates) {
  resultsTableBody.innerHTML = "";
  certificates.forEach(cert => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cert.certificado}</td>
      <td>${cert.producto}</td>
      <td>${cert.marca}</td>
      <td>${cert.modelo}</td>
      <td><a href="${cert.pdf_url}" target="_blank">Ver PDF</a></td>
    `;
    resultsTableBody.appendChild(tr);
  });
}

// Filtrar según inputs
function filterCertificates() {
  const productoFilter = searchProducto.value.toLowerCase();
  const modeloFilter = searchModelo.value.toLowerCase();

  const filtered = allCertificates.filter(cert => {
    return cert.producto.toLowerCase().includes(productoFilter) &&
           cert.modelo.toLowerCase().includes(modeloFilter);
  });

  renderTable(filtered);
}

// Listeners de búsqueda
searchProducto.addEventListener("input", filterCertificates);
searchModelo.addEventListener("input", filterCertificates);

// Inicializar
loadCertificates();
