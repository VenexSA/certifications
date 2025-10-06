// js/admin.js

// Inicializar Supabase con la variable global de la CDN
const supabaseClient = supabase.createClient(
  "https://guhycosuznmmmupsztqn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc"
);

const adminSection = document.getElementById("adminSection");
const authSection = document.getElementById("authSection");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtn = document.getElementById("loginBtn");
const certificateForm = document.getElementById("certificateForm");
const adminTableBody = document.getElementById("adminTableBody");
const cancelEditBtn = document.getElementById("cancelEdit");
const certIdInput = document.getElementById("certId");
const pdfFileInput = document.getElementById("pdfFile");
const pdfUrlInput = document.getElementById("pdf_url");

// -------- Login con Google --------
loginBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://certifications.venex.com.ar/admin.html"
    }
  });
});

// -------- Cerrar sesión --------
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.reload();
});

// -------- Verificar sesión --------
async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    adminSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    renderAdminTable(data.session.access_token);
  } else {
    adminSection.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
}

// -------- Cargar certificados --------
async function renderAdminTable(token) {
  try {
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

    // Listeners botones
    adminTableBody.querySelectorAll(".editBtn").forEach(btn => {
      btn.addEventListener("click", () => editCertificate(btn.dataset.id, token));
    });

    adminTableBody.querySelectorAll(".deleteBtn").forEach(btn => {
      btn.addEventListener("click", () => deleteCertificate(btn.dataset.id, token));
    });

  } catch (err) {
    console.error("Error cargando certificados:", err);
  }
}

// -------- Editar certificado --------
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

// -------- Cancelar edición --------
cancelEditBtn.addEventListener("click", () => {
  certIdInput.value = "";
  certificateForm.reset();
});

// -------- Subir PDF --------
async function uploadPdf(file) {
  if (!file) return null;
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabaseClient.storage
    .from("pdfs")
    .upload(fileName, file, { cacheControl: "3600", upsert: true });
  if (error) {
    alert("Error subiendo el PDF: " + error.message);
    return null;
  }
  const { publicUrl, error: urlError } = supabaseClient.storage
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

// -------- Crear / Actualizar certificado --------
certificateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = (await supabaseClient.auth.getSession()).data.session?.access_token;
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
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(certData)
  });

  certificateForm.reset();
  certIdInput.value = "";
  renderAdminTable(token);
});

// -------- Eliminar certificado --------
async function deleteCertificate(id, token) {
  if (!confirm("¿Estás seguro de eliminar este certificado?")) return;
  await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  renderAdminTable(token);
}

// -------- Inicializar --------
checkSession();
