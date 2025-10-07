// js/admin.js
const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc"; // no uses la service role aquí

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

// Helpers UI
function showLogin(msg) {
  if (msg) { statusBox.textContent = msg; statusBox.classList.remove("hidden"); }
  else { statusBox.classList.add("hidden"); }
  adminSection.classList.add("hidden");
  authSection.classList.remove("hidden");
}
function showAdmin() {
  statusBox.classList.add("hidden");
  authSection.classList.add("hidden");
  adminSection.classList.remove("hidden");
}

// Login con Google 
loginBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://certifications.venex.com.ar/admin.html",
      queryParams: { prompt: "select_account" },
    },
  });
});

// Cerrar sesión 
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin("Sesión cerrada. Por favor, ingresa nuevamente.");
});

// Verificación: sesión + autorización backend
async function checkAuth() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if (!session) {
    showLogin();
    return;
  }

  try {
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/check", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      showAdmin();
      await renderAdminTable(session.access_token);
      return;
    }

    await supabaseClient.auth.signOut();
    showLogin("Tu usuario no está autorizado para el uso de este recurso. Por favor contacta a un administrador.");
  } catch (e) {
    console.error(e);
    showLogin("No se pudo verificar la autorización. Intentalo de nuevo.");
  }
}
checkAuth();

// Render tabla admin
async function renderAdminTable(token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/getCertificates", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await supabaseClient.auth.signOut();
    showLogin("Sesión no autorizada o expirada. Volvé a iniciar sesión.");
    return;
  }

  const data = await res.json();
  adminTableBody.innerHTML = "";
  data.forEach((cert) => {
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
        <button class="editBtn" data-id="${cert.id}">Editar</button>
        <button class="deleteBtn" data-id="${cert.id}">Eliminar</button>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  adminTableBody.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", () => editCertificate(btn.dataset.id, token));
  });
  adminTableBody.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.addEventListener("click", () => deleteCertificate(btn.dataset.id, token));
  });
}

// Editar certificado (carga el registro en el form)
async function editCertificate(id, token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/getCertificates", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const cert = data.find((c) => String(c.id) === String(id));
  if (!cert) return;

  certIdInput.value = cert.id;
  document.getElementById("producto").value = cert.producto;
  document.getElementById("marca").value = cert.marca;
  document.getElementById("modelo").value = cert.modelo;
  document.getElementById("certificado").value = cert.certificado;
  pdfUrlInput.value = cert.pdf_url || "";
}

// Cancelar edición
cancelEditBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
});

// Guardar/Actualizar
certificateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return showLogin("Sesión no válida.");

  // Obligo a agregar el certificado
  if (!pdfUrlInput.value || !pdfUrlInput.value.trim()) {
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

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(certData),
  });

  certificateForm.reset();
  certIdInput.value = "";
  renderAdminTable(token);
});

// Eliminar
async function deleteCertificate(id, token) {
  if (!confirm("Estás seguro de eliminar este certificado?")) return;
  await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  renderAdminTable(token);
}

// Subida de PDFs 
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

  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return showLogin("Sesión no válida.");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, 
    body: fd,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert("Error subiendo PDF: " + (err.error || res.status));
    e.target.value = "";
    return;
  }

  const { url } = await res.json();
  pdfUrlInput.value = url;
  alert("PDF cargado correctamente.");
});
