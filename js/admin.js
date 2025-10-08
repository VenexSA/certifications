const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc"; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const adminSection    = document.getElementById("adminSection");
const authSection     = document.getElementById("authSection");
const statusBox       = document.getElementById("status");
const loginBtn        = document.getElementById("loginBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const certificateForm = document.getElementById("certificateForm");
const adminTableBody  = document.getElementById("adminTableBody");
const cancelEditBtn   = document.getElementById("cancelEdit");
const certIdInput     = document.getElementById("certId");
const pdfFileInput    = document.getElementById("pdfFile");
const pdfUrlInput     = document.getElementById("pdf_url");
const toggleBtn       = document.getElementById("toggleFormBtn");
const formTitle       = document.getElementById("formTitle");

// === FILTROS ===
const filterInputs = {
  certificado: document.getElementById("filterCertificado"),
  producto: document.getElementById("filterProducto"),
  marca: document.getElementById("filterMarca"),
  modelo: document.getElementById("filterModelo"),
};
const clearFiltersBtn = document.getElementById("clearFilters");
let allCertificates = [];

// --- HELPERS UI ---
function showLogin(msg) {
  if (msg) { statusBox.textContent = msg; statusBox.classList.remove("hidden"); }
  else { statusBox.classList.add("hidden"); }
  adminSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  logoutBtn.style.display = "none";
}

function showAdmin() {
  statusBox.classList.add("hidden");
  authSection.classList.add("hidden");
  adminSection.classList.remove("hidden");
  logoutBtn.style.display = "inline-flex";
}

// --- LOGIN ---
loginBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://certifications.venex.com.ar/admin.html",
      queryParams: { prompt: "select_account" },
    },
  });
});

// --- LOGOUT ---
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin("Sesión cerrada. Por favor, ingresa nuevamente.");
});

async function checkAuth() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;
  if (!session) return showLogin();

  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/check", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      showAdmin();
      await renderAdminTable(session.access_token);
      return;
    }

    if (res.status === 403 || res.status === 401) {
      await supabaseClient.auth.signOut();
      showLogin("Usuario no autorizado o sesión expirada.");
      return;
    }

    throw new Error(`Error inesperado (${res.status})`);

  } catch (e) {
    console.error(e);
    showLogin("No se pudo verificar la autorización.");
  }
}

checkAuth();

// --- TOGGLE FORM ---
toggleBtn.addEventListener("click", () => {
  certificateForm.classList.toggle("hidden");
  const isVisible = !certificateForm.classList.contains("hidden");
  if (isVisible) {
    formTitle.textContent = "Crear nuevo certificado";
    formTitle.classList.remove("hidden");
  } else {
    formTitle.classList.add("hidden");
  }
});

// --- RENDER TABLE ---
async function renderAdminTable(token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/getCertificates", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    await supabaseClient.auth.signOut();
    showLogin("Sesión no autorizada o expirada.");
    return;
  }
  allCertificates = await res.json();
  renderFilteredTable(allCertificates);
}

// --- FILTRO LOCAL ---
function renderFilteredTable(data) {
  adminTableBody.innerHTML = "";
  if (!data.length) {
    adminTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#777;">No se encontraron resultados.</td></tr>`;
    return;
  }

  data.forEach(cert => {
    const hasPdf = !!(cert.pdf_url && cert.pdf_url.trim().length);
    const pdfCell = hasPdf
      ? `<a href="${cert.pdf_url}" target="_blank" rel="noopener">Ver PDF</a>`
      : `<span class="badge">Sin certificado</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cert.certificado}</td>
      <td>${cert.producto}</td>
      <td>${cert.marca}</td>
      <td>${cert.modelo}</td>
      <td>${pdfCell}</td>
      <td>
        <button class="editBtn" title="Editar" data-id="${cert.id}">✏️</button>
        <button class="deleteBtn" title="Eliminar" data-id="${cert.id}">🗑️</button>
      </td>`;
    adminTableBody.appendChild(tr);
  });

  adminTableBody.querySelectorAll(".editBtn").forEach(btn =>
    btn.addEventListener("click", () => editCertificate(btn.dataset.id))
  );
  adminTableBody.querySelectorAll(".deleteBtn").forEach(btn =>
    btn.addEventListener("click", () => deleteCertificate(btn.dataset.id))
  );
}

// === FILTROS ===
function applyFilters() {
  const certValue = filterInputs.certificado.value.toLowerCase();
  const prodValue = filterInputs.producto.value.toLowerCase();
  const marcaValue = filterInputs.marca.value.toLowerCase();
  const modeloValue = filterInputs.modelo.value.toLowerCase();

  const filtered = allCertificates.filter(cert => 
    cert.certificado.toLowerCase().includes(certValue) &&
    cert.producto.toLowerCase().includes(prodValue) &&
    cert.marca.toLowerCase().includes(marcaValue) &&
    cert.modelo.toLowerCase().includes(modeloValue)
  );

  renderFilteredTable(filtered);
}

Object.values(filterInputs).forEach(input => input.addEventListener("input", applyFilters));
clearFiltersBtn.addEventListener("click", () => {
  Object.values(filterInputs).forEach(i => i.value = "");
  renderFilteredTable(allCertificates);
});
