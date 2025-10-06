// js/admin.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminSection = document.getElementById("adminSection");
const authSection = document.getElementById("authSection");

const certForm = document.getElementById("certForm");
const certTableBody = document.getElementById("certTableBody");

let currentUser = null;

// Lista blanca de emails autorizados
const allowedEmails = ["usuario1@venex.com.ar","usuario2@venex.com.ar"];

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    if (!allowedEmails.includes(currentUser.email)) {
      alert("No estás autorizado para acceder a esta sección.");
      window.location.href = "/index.html";
    } else {
      adminSection.classList.remove("hidden");
      authSection.classList.add("hidden");
      loadCertifications();
    }
  }
}

// Login con Google
loginBtn.addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });
  if (error) console.error(error);
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// Cargar registros
async function loadCertifications() {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates");
  const data = await res.json();
  certTableBody.innerHTML = "";
  data.forEach(cert => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cert.producto}</td>
      <td>${cert.marca}</td>
      <td>${cert.modelo}</td>
      <td>${cert.certificado}</td>
      <td><a href="${cert.pdf_url}" target="_blank">Ver PDF</a></td>
      <td>
        <button class="editBtn" data-id="${cert.id}">Editar</button>
        <button class="deleteBtn" data-id="${cert.id}">Eliminar</button>
      </td>
    `;
    certTableBody.appendChild(tr);
  });
  addRowListeners();
}

// Agregar listeners a botones Editar y Eliminar
function addRowListeners() {
  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      const row = e.target.closest("tr").children;
      document.getElementById("certId").value = id;
      document.getElementById("producto").value = row[0].textContent;
      document.getElementById("marca").value = row[1].textContent;
      document.getElementById("modelo").value = row[2].textContent;
      document.getElementById("certificado").value = row[3].textContent;
      document.getElementById("pdf_url").value = row[4].querySelector("a").href;
    });
  });

  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.dataset.id;
      await fetch(`https://certifications-backend-jnnv.onrender.com/api/deleteCertificate/${id}`, {
        method: "DELETE",
      });
      loadCertifications();
    });
  });
}

// Crear / actualizar registro
certForm.addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.getElementById("certId").value;
  const payload = {
    producto: document.getElementById("producto").value,
    marca: document.getElementById("marca").value,
    modelo: document.getElementById("modelo").value,
    certificado: document.getElementById("certificado").value,
    pdf_url: document.getElementById("pdf_url").value,
  };

  if (id) {
    await fetch(`https://certifications-backend-jnnv.onrender.com/api/updateCertificate/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch("https://certifications-backend-jnnv.onrender.com/api/createCertificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
  certForm.reset();
  loadCertifications();
});

// Comprobar sesión al cargar
checkSession();
