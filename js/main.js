// js/main.js
const tableBody = document.getElementById("tableBody");
const searchProducto = document.getElementById("searchProducto");
const searchMarca = document.getElementById("searchMarca");

async function loadCertificates() {
  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates");
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    console.error("Error cargando certificados:", err);
  }
}

function renderTable(data) {
  tableBody.innerHTML = "";
  const productoFilter = searchProducto.value.toLowerCase();
  const marcaFilter = searchMarca.value.toLowerCase();

  data
    .filter(c => 
      c.producto.toLowerCase().includes(productoFilter) &&
      c.marca.toLowerCase().includes(marcaFilter)
    )
    .forEach(cert => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cert.certificado}</td>
        <td>${cert.producto}</td>
        <td>${cert.marca}</td>
        <td>${cert.modelo}</td>
        <td><a href="${cert.pdf_url}" target="_blank">Ver PDF</a></td>
      `;
      tableBody.appendChild(tr);
    });
}

// Eventos de filtros
searchProducto.addEventListener("input", loadCertificates);
searchMarca.addEventListener("input", loadCertificates);

// Cargar tabla al inicio
loadCertificates();
