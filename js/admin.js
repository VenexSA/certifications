// js/admin.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://guhycosuznmmmupsztqn.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aHljb3N1em5tbW11cHN6dHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTk4NzAsImV4cCI6MjA3NTE5NTg3MH0.aRqaIr5UkW6V62iv92_VV-SnYv8dCHj7v8KNxTCG-Rc";  // Key pública para login de usuario

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const adminSection = document.getElementById("adminSection");
const authSection = document.getElementById("authSection");
const logoutBtn = document.getElementById("logoutBtn");

// Login con Google
document.getElementById("loginBtn").addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://certifications.venex.com.ar/admin.html"
    }
  });
});

// Cerrar sesión
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// Verificar sesión activa
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const user = data.session.user;
    // Mostrar sección admin
    adminSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    loadCertifications(data.session.access_token);
  } else {
    adminSection.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
}

// Cargar certificados usando token para backend
async function loadCertifications(token) {
  const res = await fetch("https://certifications-backend-jnnv.onrender.com/api/getCertificates", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const data = await res.json();
  console.log("Certifications:", data);
  // Renderizar en la tabla de admin (implementá tu renderTableAdmin)
}

checkSession();
