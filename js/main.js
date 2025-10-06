const certTableBody = document.getElementById("certTableBody");
const searchProducto = document.getElementById("searchProducto");
const searchMarca = document.getElementById("searchMarca");
const searchModelo = document.getElementById("searchModelo");
const clearFilters = document.getElementById("clearFilters");

let allCertifications = [];

// Obtener todos los certificados desde el backend
async function loadCertifications() {
  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates");
    allCertifications = await res.json();
    renderTable(allCertifications);
  } catch (err) {
    console.error("Error cargando certificados:", err);
    certTableBody.innerHTML = `<tr><td colspan="5">Error cargando certificados.</td></tr>`;
  }
}

// Renderizar tabla según array
function renderTable(data) {
  certTableBody.innerHTML = "";
  if (!data.length) {
    certTableBody.innerHTML = `<tr><td colspan="5">No hay registros</td></tr>`;
    return;
  }

  data.forEach(cert => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cert.certificado}</td>
      <td>${cert.producto}</td>
      <td>${cert.marca}</td>
      <td>${cert.modelo}</td>
      <td><a href="${cert.pdf_url}" target="_blank">Ver PDF</a></td>
    `;
    certTableBody.appendChild(tr);
  });
}

// Filtro parcial
function filterCertifications() {
  const producto = searchProducto.value.toLowerCase();
  const marca = searchMarca.value.toLowerCase();
  const modelo = searchModelo.value.toLowerCase();

  const filtered = allCertifications.filter(cert => {
    return (
      cert.producto.toLowerCase().includes(producto) &&
      cert.marca.toLowerCase().includes(marca) &&
      cert.modelo.toLowerCase().includes(modelo)
    );
  });

  renderTable(filtered);
}

// Eventos de búsqueda
searchProducto.addEventListener("input", filterCertifications);
searchMarca.addEventListener("input", filterCertifications);
searchModelo.addEventListener("input", filterCertifications);

clearFilters.addEventListener("click", () => {
  searchProducto.value = "";
  searchMarca.value = "";
  searchModelo.value = "";
  renderTable(allCertifications);
});

// Cargar datos al inicio
loadCertifications();
