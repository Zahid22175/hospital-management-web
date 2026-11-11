import {
  db,
  auth,
  signOut,
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  onAuthStateChanged,
} from "../../firebase.js";

// ===== AUTH GUARD =====
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("/login/login.html");
  } else {
    document.body.classList.remove("hidden");
  }
});

// ===== MOBILE MENU TOGGLE =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleMenu() {
  sidebar?.classList.toggle('-translate-x-full');
  sidebarOverlay?.classList.toggle('hidden');
}

mobileMenuBtn?.addEventListener('click', toggleMenu);
closeSidebarBtn?.addEventListener('click', toggleMenu);
sidebarOverlay?.addEventListener('click', toggleMenu);

// ===== DASHBOARD TOP BAR COUNTERS =====
const doctorCount = document.getElementById("doctorCount");
const patientCount = document.getElementById("patientCount");
const appointmentCount = document.getElementById("appointmentCount");
const departmentCount = document.getElementById("departmentCount");
const staffCount = document.getElementById("staffCount");
const messageCount = document.getElementById("messageCount");

// ===== LOGOUT SYSTEM =====
{
  const btn = document.querySelector(".logout-btn") || document.getElementById("logoutBtn");

  if (btn) {
    btn.addEventListener("click", async (e) => {
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
        window.location.href = "/login/login.html";
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
}

// ===== REALTIME COUNTERS =====
let usersDocCount = 0;
let adminDocCount = 0;

const updateDoctorCount = () => {
  if (doctorCount) {
    const total = usersDocCount + adminDocCount;
    doctorCount.innerText = total;
    localStorage.setItem("lastDoctorCount", total);
  }
};

onSnapshot(collection(db, "doctor"), (snapshot) => {
  adminDocCount = snapshot.size;
  updateDoctorCount();
});

let usersPatCount = 0;
let directPatCount = 0;

const updatePatientCount = () => {
  if (patientCount) {
    const total = usersPatCount + directPatCount;
    patientCount.innerText = total;
  }
};

onSnapshot(collection(db, "patient"), (snapshot) => {
  directPatCount = snapshot.size;
  updatePatientCount();
});

let usersStaffCount = 0;

onSnapshot(collection(db, "users"), (snapshot) => {
  let tempDocCount = 0;
  let tempPatCount = 0;
  let tempStaffCount = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.role === "doctor") tempDocCount++;
    if (data.role === "patient") tempPatCount++;
    if (data.role === "staff") tempStaffCount++;
  });

  usersDocCount = tempDocCount;
  usersPatCount = tempPatCount;
  usersStaffCount = tempStaffCount;

  updateDoctorCount();
  updatePatientCount();
  if (staffCount) staffCount.innerText = usersStaffCount;
});

onSnapshot(collection(db, "appointments"), (snap) => appointmentCount && (appointmentCount.innerText = snap.size));
onSnapshot(collection(db, "departments"), (snap) => departmentCount && (departmentCount.innerText = snap.size));
onSnapshot(collection(db, "contacts"), (snap) => messageCount && (messageCount.innerText = snap.size));

// ===== DOM ELEMENTS & STATE =====
const modal = document.getElementById("departmentModal");
const addBtn = document.getElementById("addDepartmentBtn");
const cancelBtn = document.getElementById("cancelDepartmentBtn");
const cancelCross = document.getElementById("cancelModalCross");
const gridContainer = document.getElementById("departmentGridContainer");
const searchInput = document.getElementById("searchInput");
const form = document.getElementById("departmentForm");
const detailModal = document.getElementById("detailViewModal");

let editId = null;
let currentSnapshot = null;
const departmentsMap = new Map();

// ===== MODAL OPEN / CLOSE =====
addBtn?.addEventListener("click", () => {
  form?.reset();
  editId = null;
  
  const modalTitle = document.getElementById("modalTitle");
  const selectedDept = document.getElementById("selectedDepartment");
  const departmentNameInput = document.getElementById("departmentName");

  if (modalTitle) modalTitle.innerText = "Add Department";
  if (selectedDept) {
    selectedDept.innerText = "Select Department";
    selectedDept.className = "text-slate-400 font-medium";
  }
  if (departmentNameInput) departmentNameInput.value = "";

  modal?.classList.remove("hidden");
  modal?.classList.add("flex");
  document.body.classList.add("overflow-hidden");
});

const closeModal = () => {
  modal?.classList.add("hidden");
  modal?.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
};

cancelBtn?.addEventListener("click", closeModal);
cancelCross?.addEventListener("click", closeModal);

modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ===== FORM SUBMISSION (SAVE / EDIT) =====
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const deptName = document.getElementById("departmentName")?.value || "";

  // Dynamic treatments
  const customTreatments = [];
  for (let i = 1; i <= 4; i++) {
    const title = document.getElementById(`treatTitle${i}`)?.value.trim();
    const desc = document.getElementById(`treatDesc${i}`)?.value.trim();
    if (title) {
      customTreatments.push({ 
        title: title, 
        desc: desc || "Specialized dental treatment." 
      });
    }
  }

  const data = {
    name: deptName,
    head: document.getElementById("headDoctor")?.value || "Dr. Amelia Hart",
    location: document.getElementById("floorLocation")?.value || "Dental Wing - 1st Floor",
    doctors: Number(document.getElementById("totalDoctors")?.value || 0),
    patients: Number(document.getElementById("totalPatients")?.value || 0),
    imageUrl: document.getElementById("departmentImageUrl")?.value || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800",
    about: document.getElementById("departmentAbout")?.value || "No about description provided.",
    status: document.getElementById("status")?.value || "Active",
    treatments: customTreatments
  };

  try {
    if (editId) {
      // UPDATE FIRESTORE
      await updateDoc(doc(db, "departments", editId), data);
      showSweetAlert("Updated!", "Department updated successfully.");
    } else {
      // ADD NEW FIRESTORE DOCUMENT
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "departments"), data);
      showSweetAlert("Created!", "New department added successfully.");
    }
    closeModal();
  } catch (err) {
    console.error("Firestore Save Error:", err);
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Failed to save department details.",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e"
    });
  }
});

// ===== TABLE RENDER =====
onSnapshot(query(collection(db, "departments")), (snapshot) => {
  currentSnapshot = snapshot;
  departmentsMap.clear();

  snapshot.forEach((docSnap) => {
    departmentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
  });

  renderGrid(snapshot);
});

function renderGrid(snapshot) {
  if (!gridContainer || !snapshot) return;
  gridContainer.innerHTML = "";

  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
  let count = 0;

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const id = docSnap.id;

    const deptName = item.name || "General Department";
    const headDoc = item.head || "Not Assigned";
    const loc = item.location || "Main Building";
    const staff = (item.patients || 0) + (item.doctors || 0);
    const about = item.about || "No description provided.";
    const image = item.imageUrl || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800";

    if (searchVal && !deptName.toLowerCase().includes(searchVal) && !headDoc.toLowerCase().includes(searchVal)) {
      return;
    }

    count++;

    gridContainer.innerHTML += `
      <div onclick="openDetailModal('${id}')" class="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between group cursor-pointer">
        <div>
          <!-- COVER IMAGE -->
          <div class="relative h-44 overflow-hidden bg-slate-950">
            <img src="${image}" alt="${deptName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
            
            <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${item.status === 'Inactive' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
              ${item.status || 'Active'}
            </span>
          </div>

          <!-- CARD BODY -->
          <div class="p-5">
            <h3 class="text-lg font-extrabold text-white group-hover:text-cyan-400 transition-colors">${deptName}</h3>

            <div class="flex items-center justify-between gap-2 my-2.5">
              <span class="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 text-[11px] font-medium truncate">
                ${loc}
              </span>
              <span class="text-[11px] font-bold text-slate-400">${staff} Total Care</span>
            </div>

            <p class="text-slate-400 text-xs line-clamp-2 leading-relaxed mt-1">
              ${about}
            </p>
          </div>
        </div>

        <!-- FOOTER DETAILS -->
        <div class="p-5 pt-0 border-t border-slate-800/50 mt-2 flex items-center justify-between" onclick="event.stopPropagation()">
          <div>
            <span class="text-[10px] text-slate-500 uppercase font-semibold block">Head Doctor</span>
            <span class="text-xs font-bold text-slate-200">${headDoc}</span>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="editDept('${id}')" class="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition flex items-center justify-center cursor-pointer" title="Edit Department">
              <i class="fas fa-pen text-xs"></i>
            </button>
            <button onclick="deleteDept('${id}')" class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition flex items-center justify-center cursor-pointer" title="Delete">
              <i class="fas fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  if (count === 0) {
    gridContainer.innerHTML = `
      <div class="col-span-full text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
        <i class="fas fa-building-circle-xmark text-4xl text-slate-600 mb-3 block"></i>
        <p class="text-slate-400 text-sm font-medium">No departments found</p>
      </div>`;
  }
}

// SEARCH EVENT
searchInput?.addEventListener("input", () => {
  if (currentSnapshot) renderGrid(currentSnapshot);
});

// ===== OPEN POPUP DETAIL VIEW =====
window.openDetailModal = (id) => {
  const item = departmentsMap.get(id);
  if (!item) return;

  const detailTitle = document.getElementById("detailTitle");
  const detailImage = document.getElementById("detailImage");
  const detailLocText = document.getElementById("detailLocText");
  const detailHeadName = document.getElementById("detailHeadName");
  const detailAbout = document.getElementById("detailAbout");
  const detailDoctorsCount = document.getElementById("detailDoctorsCount");
  const detailPatientsCount = document.getElementById("detailPatientsCount");
  const detailStatus = document.getElementById("detailStatus");

  if (detailTitle) detailTitle.innerText = item.name || "Department Details";
  if (detailImage) detailImage.src = item.imageUrl || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800";
  if (detailLocText) detailLocText.innerText = item.location || "Dental Wing";
  if (detailHeadName) detailHeadName.innerText = item.head || "Dr. Amelia Hart";
  if (detailAbout) detailAbout.innerText = item.about || "No description provided for this department.";
  if (detailDoctorsCount) detailDoctorsCount.innerText = item.doctors || 0;
  if (detailPatientsCount) detailPatientsCount.innerText = (item.patients || 0) + "+";
  if (detailStatus) detailStatus.innerText = item.status || "Active";

  // Dynamic Treatments Render
  const grid = document.getElementById("detailTreatmentsGrid");
  if (grid) {
    grid.innerHTML = "";

    if (item.treatments && item.treatments.length > 0) {
      item.treatments.forEach(t => {
        grid.innerHTML += `
          <div class="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-1">
              <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span class="font-bold text-slate-200 text-xs">${t.title}</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed pl-4">${t.desc}</p>
          </div>
        `;
      });
    } else {
      grid.innerHTML = `<p class="col-span-full text-slate-500 text-xs italic">No specialist treatments listed for this department.</p>`;
    }
  }

  detailModal?.classList.remove("hidden");
  detailModal?.classList.add("flex");
  document.body.classList.add("overflow-hidden");
};

window.closeDetailModal = () => {
  detailModal?.classList.add("hidden");
  detailModal?.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
};

detailModal?.addEventListener("click", (e) => {
  if (e.target === detailModal) window.closeDetailModal();
});

// ===== EDIT DEPARTMENT =====
window.editDept = (id) => {
  const data = departmentsMap.get(id);
  if (!data) return;

  editId = id;

  const modalTitle = document.getElementById("modalTitle");
  const deptInput = document.getElementById("departmentName");
  const selectedDept = document.getElementById("selectedDepartment");
  const headInput = document.getElementById("headDoctor");
  const locInput = document.getElementById("floorLocation");
  const docsInput = document.getElementById("totalDoctors");
  const patsInput = document.getElementById("totalPatients");
  const imgInput = document.getElementById("departmentImageUrl");
  const aboutInput = document.getElementById("departmentAbout");
  const statusInput = document.getElementById("status");

  if (modalTitle) modalTitle.innerText = "Edit Department";
  if (deptInput) deptInput.value = data.name || "";
  if (selectedDept) {
    selectedDept.innerText = data.name || "Select Department";
    selectedDept.className = "text-white font-semibold";
  }
  if (headInput) headInput.value = data.head || "";
  if (locInput) locInput.value = data.location || "";
  if (docsInput) docsInput.value = data.doctors || 0;
  if (patsInput) patsInput.value = data.patients || 0;
  if (imgInput) imgInput.value = data.imageUrl || "";
  if (aboutInput) aboutInput.value = data.about || "";
  if (statusInput) statusInput.value = data.status || "Active";

  // Fill Status UI
  const selectedStatus = document.getElementById("selectedStatus");
  if (selectedStatus) {
    if (data.status === "Active") {
      selectedStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span> Active`;
      selectedStatus.className = "text-emerald-400 font-semibold flex items-center gap-2";
    } else {
      selectedStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span> Inactive`;
      selectedStatus.className = "text-rose-400 font-semibold flex items-center gap-2";
    }
  }

  // Populate Treatments Inputs in Form
  for (let i = 1; i <= 4; i++) {
    const titleInput = document.getElementById(`treatTitle${i}`);
    const descInput = document.getElementById(`treatDesc${i}`);
    const t = data.treatments && data.treatments[i - 1];

    if (titleInput) titleInput.value = t ? t.title : "";
    if (descInput) descInput.value = t ? t.desc : "";
  }

  modal?.classList.remove("hidden");
  modal?.classList.add("flex");
  document.body.classList.add("overflow-hidden");
};

// ===== DELETE DEPARTMENT =====
window.deleteDept = async (id) => {
  const res = await Swal.fire({
    title: 'Delete Department?',
    text: "Are you sure you want to delete this Department permanently?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#334155',
    confirmButtonText: 'Confirm Delete',
    cancelButtonText: 'Cancel',
    background: '#0f172a',
    color: '#f8fafc'
  });

  if (res.isConfirmed) {
    try {
      await deleteDoc(doc(db, "departments", id));
      showSweetAlert('Deleted!', 'Department record removed successfully.');
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: 'Could not delete department.',
        background: '#0f172a',
        color: '#f8fafc'
      });
    }
  }
};

// ===== ALERT UTILITY HELPER =====
function showSweetAlert(title, text) {
  Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    background: '#0f172a',
    color: '#f8fafc',
    timer: 1800,
    showConfirmButton: false
  });
}

// ===== CUSTOM DROPDOWNS LOGIC =====
const deptBtn = document.getElementById("departmentBtn");
const deptDropdown = document.getElementById("departmentDropdown");
const deptArrow = document.getElementById("departmentArrow");
const departmentNameInput = document.getElementById("departmentName");
const selectedDepartment = document.getElementById("selectedDepartment");

const statBtn = document.getElementById("statusBtn");
const statDropdown = document.getElementById("statusDropdown");
const statArrow = document.getElementById("statusArrow");
const statusInput = document.getElementById("status");

deptBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  statDropdown?.classList.add("hidden");
  statArrow?.classList.remove("rotate-180");
  
  deptDropdown?.classList.toggle("hidden");
  deptArrow?.classList.toggle("rotate-180");
});

document.querySelectorAll(".department-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = item.textContent.trim();
    if (departmentNameInput) departmentNameInput.value = text;
    if (selectedDepartment) {
      selectedDepartment.textContent = text;
      selectedDepartment.className = "text-white font-semibold";
    }
    deptDropdown?.classList.add("hidden");
    deptArrow?.classList.remove("rotate-180");
  });
});

statBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  deptDropdown?.classList.add("hidden");
  deptArrow?.classList.remove("rotate-180");

  statDropdown?.classList.toggle("hidden");
  statArrow?.classList.toggle("rotate-180");
});

document.querySelectorAll(".status-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    const val = item.getAttribute("data-value");
    if (statusInput) statusInput.value = val;

    const selectedStatus = document.getElementById("selectedStatus");
    if (selectedStatus) {
      if (val === "Active") {
        selectedStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span> Active`;
        selectedStatus.className = "text-emerald-400 font-semibold flex items-center gap-2";
      } else {
        selectedStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span> Inactive`;
        selectedStatus.className = "text-rose-400 font-semibold flex items-center gap-2";
      }
    }
    statDropdown?.classList.add("hidden");
    statArrow?.classList.remove("rotate-180");
  });
});

document.addEventListener("click", (e) => {
  if (!deptBtn?.contains(e.target) && !deptDropdown?.contains(e.target)) {
    deptDropdown?.classList.add("hidden");
    deptArrow?.classList.remove("rotate-180");
  }
  if (!statBtn?.contains(e.target) && !statDropdown?.contains(e.target)) {
    statDropdown?.classList.add("hidden");
    statArrow?.classList.remove("rotate-180");
  }
});