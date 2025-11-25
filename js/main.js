const certTableBody = document.getElementById("certTableBody");
const filterCertificado = document.getElementById("filterCertificado");
const filterProducto = document.getElementById("filterProducto");
const filterMarca = document.getElementById("filterMarca");
const filterModelo = document.getElementById("filterModelo");
const clearFilters = document.getElementById("clearFilters");

async function loadCertifications() {
  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates");
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    console.error("Error cargando certificados:", err);
  }
}

function renderTable(data) {
  const certificadoFilter = filterCertificado.value.toLowerCase();
  const productoFilter = filterProducto.value.toLowerCase();
  const marcaFilter = filterMarca.value.toLowerCase();
  const modeloFilter = filterModelo.value.toLowerCase();

  certTableBody.innerHTML = "";

  data
    .filter(
      (cert) =>
        cert.producto.toLowerCase().includes(productoFilter) &&
        cert.marca.toLowerCase().includes(marcaFilter) &&
        cert.certificado.toLowerCase().includes(certificadoFilter) &&
        cert.modelo.toLowerCase().includes(modeloFilter)
    )
    .forEach((cert) => {
      const hasPdf = !!(cert.pdf_url && cert.pdf_url.trim().length);
      const pdfCell = hasPdf
        ? `<a href="${cert.pdf_url}" target="_blank" rel="noopener">Ver PDF</a>`
        : `<span class="badge">No cargado</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cert.certificado}</td>
        <td>${cert.producto}</td>
        <td>${cert.marca}</td>
        <td>${cert.modelo}</td>
        <td>${pdfCell}</td>
      `;
      certTableBody.appendChild(tr);
    });
}

filterProducto.addEventListener("input", loadCertifications);
filterMarca.addEventListener("input", loadCertifications);
filterModelo.addEventListener("input", loadCertifications);
filterCertificado.addEventListener("input", loadCertifications);
clearFilters.addEventListener("click", () => {
  filterProducto.value = "";
  filterMarca.value = "";
  filterModelo.value = "";
  filterCertificado.value = "";
  loadCertifications();
});

loadCertifications();


