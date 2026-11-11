import {
  auth,
  signOut,
  db,
  onAuthStateChanged,
  collection,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc
} from "../firebase.js";

// ===== DOM Elements =====
const usersTable = document.getElementById("usersTable");
const appointmentsTable = document.getElementById("appointmentsTable");
const statDoctors = document.getElementById("statDoctors");
const statPatients = document.getElementById("statPatients");
const statAppointments = document.getElementById("statAppointments");
const logoutBtn = document.getElementById("logoutBtn");
const userSearchInput = document.getElementById("userSearchInput");

// ===== Mobile Sidebar Controls =====
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Users Local Cache & Active Role Filter State
let allUsersCache = [];
let activeRoleFilter = "all";

function openSidebar() {
  sidebar?.classList.remove("-translate-x-full");
  sidebarOverlay?.classList.remove("hidden");
}

function closeSidebar() {
  sidebar?.classList.add("-translate-x-full");
  sidebarOverlay?.classList.add("hidden");
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

// ===== Auth Verification =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      await Swal.fire({
        title: "Unauthorized Access!",
        text: "You do not have permission to access the admin dashboard.",
        icon: "error",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#f43f5e",
        confirmButtonText: "Return to Login"
      });
      window.location.href = "../login/login.html";
      return;
    }

    // Admin verified, start real-time listeners
    listenToSystemStats();
    listenToSystemUsers();
    listenToAdminAppointments();
    setupRoleTabListeners();
  } catch (error) {
    console.error("Auth Verification Error:", error);
    Swal.fire({
      title: "Authentication Error",
      text: "An error occurred while verifying your permissions.",
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e"
    });
  }
});

// ===== Logout System =====
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const result = await Swal.fire({
      title: "Sign Out?",
      text: "Are you sure you want to log out of the admin panel?",
      icon: "question",
      background: "#0f172a",
      color: "#f8fafc",
      showCancelButton: true,
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#334155",
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "../login/login.html";
    } catch (error) {
      console.error("Logout Error:", error);
      Swal.fire({
        title: "Logout Failed!",
        text: error.message || "Unable to complete logout process.",
        icon: "error",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#f43f5e"
      });
    }
  });
}

// Dynamic Real-time Stats Counter
function listenToSystemStats() {
  onSnapshot(collection(db, "appointments"), (snap) => {
    if (statAppointments) statAppointments.textContent = snap.size;
  });

  onSnapshot(collection(db, "users"), (snap) => {
    let docCount = 0;
    let patCount = 0;

    snap.forEach((docSnap) => {
      const role = docSnap.data().role;
      if (role === "doctor") docCount++;
      if (role === "patient") patCount++;
    });

    if (statDoctors) statDoctors.textContent = docCount;
    if (statPatients) statPatients.textContent = patCount;
  });
}

// Role Tab Filter Listeners
function setupRoleTabListeners() {
  document.querySelectorAll(".role-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {

      // Inactive styles
      document.querySelectorAll(".role-tab").forEach((t) => {
        t.className =
          "role-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-800/60 text-slate-400 hover:text-white border border-transparent";
      });

      // Active style
      const target = e.currentTarget;
      target.className =
        "role-tab px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";

      // Set active filter state & re-render
      activeRoleFilter = target.getAttribute("data-role");
      filterAndRenderUsers();
    });
  });
}

// System Users Table Renderer
function renderUsersTable(usersList) {
  if (!usersTable) return;

  if (usersList.length === 0) {
    usersTable.innerHTML = `<tr><td colspan="4" class="text-center p-6 text-slate-500">No matching users 
    found.</td></tr>`;
    return;
  }

  usersTable.innerHTML = "";

  usersList.forEach((userItem) => {
    const user = userItem.data;
    const uid = userItem.id;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/40 transition-colors";

    let roleStyle = "bg-slate-800 text-slate-300 border-slate-700";
    if (user.role === "doctor") roleStyle = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    if (user.role === "admin") roleStyle = "bg-purple-500/10 text-purple-400 border-purple-500/30";
    if (user.role === "patient") roleStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (user.role === "staff") roleStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    

    tr.innerHTML = `
      <td class="p-4 pl-6 font-semibold text-white">${user.fullName || "N/A"}</td>
      <td class="p-4 text-slate-400">${user.email || "N/A"}</td>
      <td class="p-4">
        <span class="px-2.5 py-1 text-xs font-bold rounded-full border ${roleStyle}">
          ${(user.role || "User").toUpperCase()}
        </span>
      </td>
      <td class="p-4 text-center pr-6">
        <button onclick="deleteUserRecord('${uid}')" class="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold rounded-lg border border-rose-500/20 transition-all cursor-pointer">
          <i class="fas fa-trash-can mr-1"></i> Delete
        </button>
      </td>
    `;
    usersTable.appendChild(tr);
  });
}

function listenToSystemUsers() {
  if (!usersTable) return;

  onSnapshot(collection(db, "users"), (snap) => {
    allUsersCache = [];
    snap.forEach((docSnap) => {
      allUsersCache.push({
        id: docSnap.id,
        data: docSnap.data()
      });
    });

    filterAndRenderUsers();
  });
}

// Search Filter & Role Filter Combined Logic
function filterAndRenderUsers() {
  const searchTerm = (userSearchInput?.value || "").toLowerCase().trim();

  const filtered = allUsersCache.filter(({ data }) => {
    const name = (data.fullName || "").toLowerCase();
    const email = (data.email || "").toLowerCase();
    const userRole = (data.role || "").toLowerCase();

    const matchesSearch = !searchTerm || name.includes(searchTerm) || email.includes(searchTerm);
    const matchesRole = activeRoleFilter === "all" || userRole === activeRoleFilter;

    return matchesSearch && matchesRole;
  });

  renderUsersTable(filtered);
}

// Real-time Search
if (userSearchInput) {
  userSearchInput.addEventListener("input", filterAndRenderUsers);
}

// Appointments Table Renderer
function listenToAdminAppointments() {
  if (!appointmentsTable) return;

  onSnapshot(collection(db, "appointments"), async (snapshot) => {
    if (snapshot.empty) {
      appointmentsTable.innerHTML = `<tr><td colspan="7" class="text-center p-6 text-slate-500">No appointments 
      found.</td></tr>`;
      return;
    }

    appointmentsTable.innerHTML = "";
    let index = 1;

    for (const appDoc of snapshot.docs) {
      const data = appDoc.data();

      let patientName = data.patientName || "Unknown Patient";
      if (data.patientId && (!data.patientName || data.patientName === "N/A")) {
        const pSnap = await getDoc(doc(db, "users", data.patientId));
        if (pSnap.exists()) patientName = pSnap.data().fullName || pSnap.data().email;
      }

      let doctorName = data.doctor || "Assigned Doctor";
      if (data.doctorId && (!data.doctor || data.doctor === "N/A")) {
        const dSnap = await getDoc(doc(db, "users", data.doctorId));
        if (dSnap.exists()) {
          const docData = dSnap.data();
          doctorName = docData.fullName ? (docData.fullName.startsWith("Dr.") ? docData.fullName : `Dr. ${docData.fullName}`) : docData.email;
        }
      }

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-800/40 transition-colors";
      tr.innerHTML = `
        <td class="p-4 pl-6 font-mono text-xs text-slate-500">${String(index++).padStart(2, '0')}</td>
        <td class="p-4 text-cyan-400 font-semibold">${patientName}</td>
        <td class="p-4 text-slate-200">${doctorName}</td>
        <td class="p-4 text-slate-400">${data.date || 'N/A'}</td>
        <td class="p-4 text-slate-400">${data.time || 'N/A'}</td>
        <td class="p-4 text-slate-400">${data.reason || '-'}</td>
        <td class="p-4 text-center pr-6">
          <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            ${data.status || 'Pending'}
          </span>
        </td>
      `;
      appointmentsTable.appendChild(tr);
    }
  });
}

// Delete User
window.deleteUserRecord = async (uid) => {
  const result = await Swal.fire({
    title: "Delete User?",
    text: "Are you sure you want to delete this user account permanently?",
    icon: "warning",
    background: "#0f172a",
    color: "#f8fafc",
    showCancelButton: true,
    confirmButtonColor: "#f43f5e",
    cancelButtonColor: "#334155",
    confirmButtonText: "Confirm Delete",
    cancelButtonText: "Cancel"
  });

  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "users", uid));

    Swal.fire({
      title: "Deleted!",
      text: "User account removed successfully.",
      icon: "success",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#06b6d4",
      timer: 1800,
      showConfirmButton: false
    });
  } catch (err) {
    console.error("Delete user error:", err);
    Swal.fire({
      title: "Delete Failed!",
      text: err.message || "Unable to delete user record.",
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e"
    });
  }
};