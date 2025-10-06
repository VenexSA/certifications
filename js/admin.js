// js/admin.js

// Inicializar Supabase (UMD global)
const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc"; // solo la key pública de usuario
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const adminSection = document.getElementById("adminSection");
const authSection = document.getElementById("authSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const certificateForm = document.getElementById("certificateForm");
const adminTableBody = document.getElementById("adminTableBody");
const cancelEditBtn = document.getElementById("cancelEdit");
const certIdInput = document.getElementById("certId");
const pdfFileInput = document.getElementById("pdfFile");
const pdfUrlInput = document.getElementById("pdf_url");

// LOGIN CON GOOGLE
loginBtn.addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://certifications.venex.com.ar/admin.html"
    }
  });
});

// CERRAR SESIÓN
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// VERIFICAR SESIÓN Y RENDERIZAR TABLA
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    adminSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    renderAdminTable(data.session.access_token);
  } else {
    adminSection.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
}

// CARGAR CERTIFICADOS DESDE BACKEND
async function renderAdminTable(token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();
  adminTableBody.innerHTML = "";

  data.forEach(cert => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cert.certificado}</td>
      <td>${cert.producto}</td>
      <td>${cert.marca}</td>
      <td>${cert.modelo}</td>
      <td><a href="${cert.pdf_url}" target="_blank">Ver PDF</a></td>
      <td>
        <button class="editBtn" data-id="${cert.id}">Editar</button>
        <button class="deleteBtn" data-id="${cert.id}">Eliminar</button>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  // Editar y eliminar
  adminTableBody.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", () => editCertificate(btn.dataset.id, token));
  });
  adminTableBody.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", () => deleteCertificate(btn.dataset.id, token));
  });
}

// EDITAR CERTIFICADO
async function editCertificate(id, token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();
  const cert = data.find(c => c.id === id);
  certIdInput.value = cert.id;
  document.getElementById("producto").value = cert.producto;
  document.getElementById("marca").value = cert.marca;
  document.getElementById("modelo").value = cert.modelo;
  document.getElementById("certificado").value = cert.certificado;
  document.getElementById("pdf_url").value = cert.pdf_url;
}

// CANCELAR EDICIÓN
cancelEditBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
});

// SUBIR PDF A SUPABASE STORAGE
async function uploadPdf(file) {
  if (!file) return null;
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from("pdfs")
    .upload(fileName, file, { cacheControl: "3600", upsert: true });
  if (error) {
    alert("Error subiendo el PDF: " + error.message);
    return null;
  }
  const { publicUrl, error: urlError } = supabase.storage
    .from("pdfs")
    .getPublicUrl(fileName);
  if (urlError) {
    alert("Error obteniendo URL: " + urlError.message);
    return null;
  }
  return publicUrl;
}

pdfFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadPdf(file);
  if (url) pdfUrlInput.value = url;
});

// GUARDAR CERTIFICADO (CREATE/UPDATE)
certificateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = supabase.auth.session()?.access_token || null;
  if (!token) return alert("No autorizado");

  const certData = {
    producto: document.getElementById("producto").value,
    marca: document.getElementById("marca").value,
    modelo: document.getElementById("modelo").value,
    certificado: document.getElementById("certificado").value,
    pdf_url: pdfUrlInput.value
  };

  const id = certIdInput.value;
  const url = id
    ? `https://certifications-backend-jnnv.onrender.com/api/updateCertificate/${id}`
    : `https://certifications-backend-jnnv.onrender.com/api/createCertificate`;

  const method = id ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(certData)
  });

  certificateForm.reset();
  certIdInput.value = "";
  renderAdminTable(token);
});

// ELIMINAR CERTIFICADO
async function deleteCertificate(id, token) {
  if (!confirm("¿Estás seguro de eliminar este certificado?")) return;
  await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  renderAdminTable(token);
}

// INICIAR
checkSession();
