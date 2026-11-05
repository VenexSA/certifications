import {
  appendEmptyRow,
  appendPdfCell,
  appendTextCell,
  normalizeCertificatePdfUrl,
} from "./certificate-view.js";

/* ============== CONFIG SUPABASE ============== */
const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Para detectar cierre de sesión desde otros tabs
const PROJECT_REF = "guhycosuznmmmupsztqn";
const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

/* ============== DOM ============== */
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

const filterInputs = {
  certificado: document.getElementById("filterCertificado"),
  producto: document.getElementById("filterProducto"),
  marca: document.getElementById("filterMarca"),
  modelo: document.getElementById("filterModelo"),
};
const clearFiltersBtn = document.getElementById("clearFilters");

/* ============== Estado global ============== */
let allCertificates = [];
let currentToken = null;

/* ============== UI helpers ============== */
function showLogin(msg) {
  currentToken = null;
  if (msg) { statusBox.textContent = msg; statusBox.classList.remove("hidden"); }
  else { statusBox.classList.add("hidden"); }
  adminSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  //logoutBtn.style.display = "none";
  logoutBtn.classList.remove("visible");  
  logoutBtn.setAttribute('tabindex','-1');
}

function showAdmin() {
  statusBox.classList.add("hidden");
  authSection.classList.add("hidden");
  adminSection.classList.remove("hidden");
  //logoutBtn.style.display = "inline-flex";
  logoutBtn.classList.add("visible");
  logoutBtn.removeAttribute('tabindex');
}

/* ============== LOGIN / LOGOUT ============== */
loginBtn?.addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://certifications.venex.com.ar/admin.html",
      queryParams: { prompt: "select_account" },
    },
  });
});

logoutBtn?.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    statusBox.textContent = "No se pudo cerrar la sesión. Intenta nuevamente.";
    statusBox.classList.remove("hidden");
    return;
  }

  window.location.replace("./");
});

/* ============== AUTH CHECK + Auto sign-out cross-tab ============== */
async function checkAuth() {
  const { data, error } = await supabaseClient.auth.getSession();
  const session = data?.session;
  if (error || !session) return showLogin();

  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/check", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });

    if (res.ok) {
      showAdmin();                             
      await renderAdminTable(session.access_token);
      return;
    }

    if (res.status === 403 || res.status === 401) {
      await supabaseClient.auth.signOut();
      showLogin("Tu usuario no se encuentra autorizado para utilizar este recurso. Por favor, contacta con un administrador.");
      return;
    }

    throw new Error(`Error inesperado (${res.status})`);
  } catch (e) {
    console.error(e);
    showLogin("No se pudo verificar la autorización.");
  }
}


supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    showLogin("Sesión finalizada.");
    return;
  }
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    await checkAuth(); // checkAuth se encarga de showAdmin() 
  }
});


// Detecta logout desde *otro* tab/ventana
window.addEventListener("storage", (ev) => {
  if (ev.key === AUTH_STORAGE_KEY && ev.newValue === null) {
    showLogin("Sesión finalizada en otro tab.");
  }
});

window.addEventListener("focus", checkAuth);

checkAuth();

/* ============== TOGGLE FORM (botón fijo a la derecha) ============== */
toggleBtn.addEventListener("click", () => {
  certificateForm.classList.toggle("hidden");
  const visible = !certificateForm.classList.contains("hidden");
  if (visible) {
    formTitle.textContent = "Crear nuevo certificado";
    formTitle.classList.remove("hidden");
  } else {
    formTitle.classList.add("hidden");
  }
});

/* ============== RENDER / CARGA DATOS ============== */
async function renderAdminTable(token) {
  if (!token) {
    const { data } = await supabaseClient.auth.getSession();
    token = data.session?.access_token;
    if (!token) return showLogin("Sesión no válida.");
  }

  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/getCertificates", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    await supabaseClient.auth.signOut();
    showLogin("Tu usuario no se encuentra autorizado para utilizar este recurso. Por favor, contacta con un administrador.");
    return;
  }

  allCertificates = await res.json();
  currentToken = token;
  renderFilteredTable(allCertificates);
  applyFilters(); 
}

/* Usa datos en memoria para renderizar la tabla */
function renderFilteredTable(data) {
  adminTableBody.replaceChildren();
  if (!Array.isArray(data) || data.length === 0) {
    appendEmptyRow(adminTableBody, 6, "No se encontraron resultados.");
    return;
  }

  data.forEach(cert => {
    const row = document.createElement("tr");
    appendTextCell(row, cert.certificado);
    appendTextCell(row, cert.producto);
    appendTextCell(row, cert.marca);
    appendTextCell(row, cert.modelo);
    appendPdfCell(row, cert.pdf_url, "Sin certificado");

    const actions = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "editBtn";
    editButton.title = "Editar";
    editButton.dataset.id = String(cert.id ?? "");
    editButton.textContent = "✏️";
    const deleteButton = document.createElement("button");
    deleteButton.className = "deleteBtn";
    deleteButton.title = "Eliminar";
    deleteButton.dataset.id = String(cert.id ?? "");
    deleteButton.textContent = "🗑️";
    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    adminTableBody.appendChild(row);
  });

  // listeners por fila
  adminTableBody.querySelectorAll(".editBtn").forEach(btn =>
    btn.addEventListener("click", () => editCertificate(btn.dataset.id))
  );
  adminTableBody.querySelectorAll(".deleteBtn").forEach(btn =>
    btn.addEventListener("click", () => deleteCertificate(btn.dataset.id))
  );
}

/* ============== EDIT ============== */
function editCertificate(id) {
  const cert = allCertificates.find(c => String(c.id) === String(id));
  if (!cert) { alert("No se encontró el certificado."); return; }

  certIdInput.value = cert.id;
  document.getElementById("producto").value = cert.producto || "";
  document.getElementById("marca").value = cert.marca || "";
  document.getElementById("modelo").value = cert.modelo || "";
  document.getElementById("certificado").value = cert.certificado || "";
  pdfUrlInput.value = normalizeCertificatePdfUrl(cert.pdf_url);

  certificateForm.classList.remove("hidden");
  formTitle.textContent = "Editar un certificado";
  formTitle.classList.remove("hidden");

  certificateForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ============== CANCEL ============== */
cancelEditBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
  certificateForm.classList.add("hidden");
  formTitle.classList.add("hidden");
});

/* ============== SAVE / CREATE / UPDATE ============== */
certificateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentToken) {
    const { data } = await supabaseClient.auth.getSession();
    currentToken = data.session?.access_token;
    if (!currentToken) return showLogin("Sesión no válida.");
  }

  if (!pdfUrlInput.value || !String(pdfUrlInput.value).trim()) {
    alert("Debés subir un PDF antes de guardar.");
    return;
  }

  const certData = {
    producto: document.getElementById("producto").value,
    marca: document.getElementById("marca").value,
    modelo: document.getElementById("modelo").value,
    certificado: document.getElementById("certificado").value,
    pdf_url: pdfUrlInput.value || "",
  };

  const id = certIdInput.value;
  const url = id
    ? `https://certifications-backend-jnnv.onrender.com/api/updateCertificate/${id}`
    : `https://certifications-backend-jnnv.onrender.com/api/createCertificate`;
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
      body: JSON.stringify(certData),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("Error guardando certificado:", err);
    alert("Error guardando. Mirá la consola para más detalles.");
    return;
  }

  certificateForm.reset();
  certIdInput.value = "";
  certificateForm.classList.add("hidden");
  formTitle.classList.add("hidden");

  // Fuerza relectura desde backend y re-render
  await renderAdminTable(currentToken);
});

/* ============== DELETE ============== */
async function deleteCertificate(id) {
  if (!confirm("Estás seguro de eliminar este certificado?")) return;
  if (!currentToken) {
    const { data } = await supabaseClient.auth.getSession();
    currentToken = data.session?.access_token;
    if (!currentToken) return showLogin("Sesión no válida.");
  }

  try {
    const res = await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${currentToken}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await renderAdminTable(currentToken);
  } catch (e) {
    console.error(e);
    alert("Error eliminando certificado.");
  }
}

/* ============== UPLOAD PDF ============== */
pdfFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== "application/pdf") {
    alert("Solo se admite la carga de archivos .PDF.");
    e.target.value = "";
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    alert("El .PDF no debe superar los 3MB de peso.");
    e.target.value = "";
    return;
  }

  if (!currentToken) {
    const { data } = await supabaseClient.auth.getSession();
    currentToken = data.session?.access_token;
    if (!currentToken) return showLogin("Sesión no válida.");
  }

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
      body: fd,
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Error subiendo PDF: " + (err.error || res.status));
      e.target.value = "";
      return;
    }

    const { url } = await res.json();
    const safeUrl = normalizeCertificatePdfUrl(url);
    if (!safeUrl) throw new Error("El servidor devolvió una URL de PDF inválida.");
    pdfUrlInput.value = safeUrl;
    alert("PDF cargado correctamente.");
  } catch (err) {
    console.error("Error upload PDF:", err);
    alert("Error subiendo PDF. Revisá la consola.");
    e.target.value = "";
  }
});

/* ============== FILTROS ============== */
function applyFilters() {
  const certValue  = (filterInputs.certificado.value || "").toLowerCase().trim();
  const prodValue  = (filterInputs.producto.value || "").toLowerCase().trim();
  const marcaValue = (filterInputs.marca.value || "").toLowerCase().trim();
  const modeloValue= (filterInputs.modelo.value || "").toLowerCase().trim();

  const filtered = allCertificates.filter(cert => {
    const cCert  = String(cert.certificado || "").toLowerCase();
    const cProd  = String(cert.producto   || "").toLowerCase();
    const cMarca = String(cert.marca      || "").toLowerCase();
    const cModelo= String(cert.modelo     || "").toLowerCase();
    return cCert.includes(certValue)
        && cProd.includes(prodValue)
        && cMarca.includes(marcaValue)
        && cModelo.includes(modeloValue);
  });

  renderFilteredTable(filtered);
}

Object.values(filterInputs).forEach(input => input.addEventListener("input", applyFilters));
clearFiltersBtn.addEventListener("click", () => {
  Object.values(filterInputs).forEach(i => i.value = "");
  renderFilteredTable(allCertificates);
});

applyFilters();
