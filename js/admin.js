// js/admin.js
const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc";

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const adminSection = document.getElementById("adminSection");
const authSection = document.getElementById("authSection");
const logoutBtn = document.getElementById("logoutBtn");
const newCertBtn = document.getElementById("newCertBtn");

const certificateForm = document.getElementById("certificateForm");
const adminTableBody = document.getElementById("adminTableBody");
const cancelEditBtn = document.getElementById("cancelEdit");
const certIdInput = document.getElementById("certId");
const pdfFileInput = document.getElementById("pdfFile");
const pdfUrlInput = document.getElementById("pdf_url");

// -------- Login Google --------
document.getElementById("loginBtn").addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: "https://certifications.venex.com.ar/admin.html" }
  });
});

// -------- Logout --------
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// -------- Nuevo certificado --------
newCertBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
});

// -------- Verificar sesión --------
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session) {
    adminSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    await renderAdminTable(session.access_token);
  } else {
    adminSection.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
}

// -------- Cargar tabla --------
async function renderAdminTable(token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates", {
    headers: { Authorization: `Bearer ${token}` }
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

  // Botones editar/eliminar
  adminTableBody.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", async () => editCertificate(btn.dataset.id, (await supabase.auth.getSession()).data.session.access_token));
  });

  adminTableBody.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", async () => deleteCertificate(btn.dataset.id, (await supabase.auth.getSession()).data.session.access_token));
  });
}

// -------- Editar --------
async function editCertificate(id, token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const cert = data.find(c => c.id === id);
  certIdInput.value = cert.id;
  document.getElementById("producto").value = cert.producto;
  document.getElementById("marca").value = cert.marca;
  document.getElementById("modelo").value = cert.modelo;
  document.getElementById("certificado").value = cert.certificado;
  pdfUrlInput.value = cert.pdf_url;
}

// -------- Cancelar edición --------
cancelEditBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
});

// -------- Subida PDF --------
async function uploadPdf(file) {
  if (!file) return null;
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from("pdfs").upload(fileName, file, { cacheControl: "3600", upsert: true });
  if (error) {
    alert("Error subiendo PDF: " + error.message);
    return null;
  }
  const { publicUrl } = supabase.storage.from("pdfs").getPublicUrl(fileName);
  return publicUrl;
}

pdfFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadPdf(file);
  if (url) pdfUrlInput.value = url;
});

// -------- Crear/Actualizar --------
certificateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
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
  await renderAdminTable(token);
});

// -------- Eliminar --------
async function deleteCertificate(id, token) {
  if (!confirm("¿Estás seguro de eliminar este certificado?")) return;
  await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  await renderAdminTable(token);
}

// -------- Inicializar --------
checkSession();
