const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co";
const SUPABASE_ANON_KEY = "mi key"; // no uses service role

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
const toggleIcon      = document.getElementById("toggleIcon");
const formTitle       = document.getElementById("formTitle");

// --- HELPERS UI ---
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

// --- CHECK AUTH ---
async function checkAuth() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const session = data.session;

    if (!session) {
      showLogin();
      return;
    }

    // Verificar autorización en backend
    const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/admin/check", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      // Usuario no autorizado
      let errMsg = "Tu usuario no está autorizado para el uso de este recurso. Por favor contacta a un administrador.";
      try {
        const errData = await res.json();
        if (errData?.error) errMsg = errData.error;
      } catch (e) {
        console.error("No se pudo leer mensaje de error del backend:", e);
      }
      showLogin(errMsg);
      await supabaseClient.auth.signOut();
      return;
    }

    // Usuario autorizado
    showAdmin();  // Mostrar sección admin
    await renderAdminTable(session.access_token);

  } catch (e) {
    console.error("Error verificando sesión/autoridad:", e);
    showLogin("No se pudo verificar la autorización. Intentalo de nuevo.");
  }
}

checkAuth();

// --- TOGGLE FORM (+/-) ---
toggleBtn.addEventListener("click", () => {
  certificateForm.classList.toggle("hidden");
  const isVisible = !certificateForm.classList.contains("hidden");

  if (isVisible) {
    formTitle.textContent = "Crear nuevo certificado";
    formTitle.classList.remove("hidden");
    toggleIcon.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"/>'; // "-"
  } else {
    formTitle.classList.add("hidden");
    toggleIcon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'; // "+"
  }
});

// --- RENDER TABLE ---
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
        <button class="editBtn" title="Editar certificado" data-id="${cert.id}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
        <button class="deleteBtn" title="Eliminar certificado" data-id="${cert.id}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6L18 19a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  adminTableBody.querySelectorAll(".editBtn").forEach((btn) =>
    btn.addEventListener("click", () => editCertificate(btn.dataset.id, token))
  );
  adminTableBody.querySelectorAll(".deleteBtn").forEach((btn) =>
    btn.addEventListener("click", () => deleteCertificate(btn.dataset.id, token))
  );
}

// --- EDIT CERTIFICATE ---
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

  certificateForm.classList.remove("hidden");
  formTitle.textContent = "Editar un certificado";
  formTitle.classList.remove("hidden");
  toggleIcon.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"/>'; // "-"
}

// --- CANCEL EDIT ---
cancelEditBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
  certificateForm.classList.add("hidden");
  formTitle.classList.add("hidden");
  toggleIcon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'; // "+"
});

// --- SAVE/UPDATE ---
certificateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return showLogin("Sesión no válida.");

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
  certificateForm.classList.add("hidden");
  formTitle.classList.add("hidden");
  toggleIcon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'; // "+"
  renderAdminTable(token);
});

// --- DELETE CERTIFICATE ---
async function deleteCertificate(id, token) {
  if (!confirm("Estás seguro de eliminar este certificado?")) return;
  await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  renderAdminTable(token);
}

// --- UPLOAD PDF ---
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
