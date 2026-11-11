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
  addDoc,
  getDoc,
  serverTimestamp,
  onAuthStateChanged,
} from "../../firebase.js";

// ===== AUTH GUARD (ROUTE PROTECTION) =====
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

let userDocs = 0;
let adminDocs = 0;
let userPatients = 0;
let adminPatients = 0;

// Update Combined Doctor Counter 
const updateDocUI = () => {
  const total = userDocs + adminDocs;
  if (doctorCount) doctorCount.innerText = total;
  localStorage.setItem("lastDoctorCount", total);
};

// Update Combined Patient Counter 
const updatePatientUI = () => {
  const total = userPatients + adminPatients;
  if (patientCount) patientCount.innerText = total;
  localStorage.setItem("lastPatientCount", total);
};

// ===== REALTIME STATS LISTENERS =====

// 1. DOCTORS
onSnapshot(collection(db, "doctor"), (snap) => {
  adminDocs = snap.size;
  updateDocUI();
});

// 2. PATIENTS
onSnapshot(collection(db, "patient"), (snap) => {
  adminPatients = snap.size;
  updatePatientUI();
});

onSnapshot(collection(db, "users"), (snap) => {
  let docCount = 0;
  let patCount = 0;

  snap.forEach((docSnap) => {
    const role = docSnap.data().role;
    if (role === "doctor") docCount++;
    if (role === "patient") patCount++;
  });

  userDocs = docCount;
  userPatients = patCount;

  updateDocUI();
  updatePatientUI();
});

// 3. APPOINTMENTS
onSnapshot(collection(db, "appointments"), (snap) => {
  if (appointmentCount) appointmentCount.innerText = snap.size;
});

// 4. DEPARTMENTS
onSnapshot(collection(db, "departments"), (snap) => {
  if (departmentCount) departmentCount.innerText = snap.size;
});

// 5. STAFF
onSnapshot(collection(db, "users"), (snapshot) => {
  let count = 0;
  snapshot.forEach((docSnap) => {
    if (docSnap.data().role === "staff") count++;
  });
  if (staffCount) staffCount.textContent = count;
});

// 6. MESSAGES
onSnapshot(collection(db, "contacts"), (snap) => {
  if (messageCount) messageCount.textContent = snap.size;
});

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

// ===== CUSTOM DROPDOWN LOGIC =====
function setupCustomDropdown(triggerId, menuId, selectId) {
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  const select = document.getElementById(selectId);
  if (!trigger || !menu || !select) return;

  const span = trigger.querySelector('.selected-value');
  const icon = trigger.querySelector('.fa-chevron-down');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });
    document.querySelectorAll('.custom-dropdown-trigger').forEach(t => {
      if (t !== trigger) t.classList.remove('border-cyan-500', 'ring-1', 'ring-cyan-500');
    });

    menu.classList.toggle('hidden');
    trigger.classList.toggle('border-cyan-500');
    trigger.classList.toggle('ring-1');
    trigger.classList.toggle('ring-cyan-500');
    if (icon) icon.classList.toggle('rotate-180');
  });

  menu.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-option');
    if (!option) return;

    const value = option.getAttribute('data-value');
    const text = option.textContent.trim();

    select.value = value;
    select.dispatchEvent(new Event('change'));

    if (span) {
      span.textContent = text;
      span.classList.remove('text-slate-500');
      span.classList.add('text-slate-100', 'font-semibold');
    }

    menu.classList.add('hidden');
    trigger.classList.remove('border-cyan-500', 'ring-1', 'ring-cyan-500');
    if (icon) icon.classList.remove('rotate-180');
  });
}

// Close dropdowns
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('.custom-dropdown-trigger').forEach(t => {
    t.classList.remove('border-cyan-500', 'ring-1', 'ring-cyan-500');
    const icon = t.querySelector('.fa-chevron-down');
    if (icon) icon.classList.remove('rotate-180');
  });
});

// custom dropdown options dynamically
function refreshCustomDropdown(selectId, menuId, defaultText) {
  const select = document.getElementById(selectId);
  const menu = document.getElementById(menuId);
  if (!select || !menu) return;

  menu.innerHTML = '';

  Array.from(select.options).forEach(opt => {
    if (opt.disabled) return;

    const div = document.createElement('div');
    div.className = 'custom-option px-4 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-400 cursor-pointer transition-colors';
    div.setAttribute('data-value', opt.value);
    div.textContent = opt.textContent;
    menu.appendChild(div);
  });
}

// Set custom dropdown value programmatically (used during Edit)
function setCustomDropdownValue(triggerId, selectId, value, defaultText) {
  const trigger = document.getElementById(triggerId);
  const select = document.getElementById(selectId);
  if (!trigger || !select) return;

  const span = trigger.querySelector('.selected-value');
  const selectedOpt = select.querySelector(`option[value="${value}"]`);

  if (selectedOpt && value) {
    select.value = value;
    if (span) {
      span.textContent = selectedOpt.textContent;
      span.classList.remove('text-slate-500');
      span.classList.add('text-slate-100', 'font-semibold');
    }
  } else {
    select.value = "";
    if (span) {
      span.textContent = defaultText;
      span.classList.remove('text-slate-100', 'font-semibold');
      span.classList.add('text-slate-500');
    }
  }
}

window.toggleTableRowDropdown = function (docId, event) {
  event?.stopPropagation();

  const wrapper = document.getElementById(
    `table-dropdown-wrapper-${docId}`
  );
  const menu = document.getElementById(`table-menu-${docId}`);
  const arrow = document.getElementById(`table-arrow-${docId}`);

  if (!wrapper || !menu) return;

  const shouldOpen = menu.classList.contains("hidden");

  // Close all other dropdowns
  document.querySelectorAll('[id^="table-menu-"]').forEach((item) => {
    item.classList.add("hidden");
    item.style.display = "none";
  });

  document.querySelectorAll('[id^="table-arrow-"]').forEach((item) => {
    item.classList.remove("rotate-180");
  });

  if (!shouldOpen) return;

  // Move menu to body to avoid overflow clipping
  if (menu.parentElement !== document.body) {
    document.body.appendChild(menu);
  }

  const rect = wrapper.getBoundingClientRect();
  const menuHeight = menu.offsetHeight || 160;
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < menuHeight + 8;

  menu.style.position = "fixed";
  menu.style.width = "140px";
  menu.style.zIndex = "99999";
  menu.style.left = "auto";
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.top = openAbove
    ? "auto"
    : `${rect.bottom + 4}px`;
  menu.style.bottom = openAbove
    ? `${window.innerHeight - rect.top + 4}px`
    : "auto";

  menu.classList.remove("hidden");
  menu.style.display = "block";

  if (arrow) arrow.classList.add("rotate-180");
};



window.selectTableRowStatus = async function (docId, newStatus, event) {
  event?.preventDefault();
  event?.stopPropagation();

  const statusMap = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected"
  };

  const status = statusMap[String(newStatus).toLowerCase()];
  if (!status) return;

  const menu = document.getElementById(`table-menu-${docId}`);

  // Close the selected dropdown immediately
  if (menu) {
    menu.classList.add("hidden");
    menu.style.display = "none";
    menu.style.visibility = "hidden";
    menu.style.pointerEvents = "none";
  }

  // Reset all dropdown arrows
  document.querySelectorAll('[id^="table-arrow-"]').forEach((arrow) => {
    arrow.classList.remove("rotate-180");
  });

  // Close any other open dropdowns too
  document.querySelectorAll('[id^="table-menu-"]').forEach((item) => {
    item.classList.add("hidden");
    item.style.display = "none";
    item.style.visibility = "hidden";
    item.style.pointerEvents = "none";
  });

  // Update the Firebase status
  try {
    await window.changeStatus(docId, status);
  } catch (error) {
    console.error("Status update failed:", error);
  }
};



// Close dropdown when clicking outside
document.addEventListener("click", (event) => {
  const clickedInsideWrapper = event.target.closest(
    '[id^="table-dropdown-wrapper-"]'
  );
  const clickedInsideMenu = event.target.closest(
    '[id^="table-menu-"]'
  );

  if (clickedInsideWrapper || clickedInsideMenu) return;

  document.querySelectorAll('[id^="table-menu-"]').forEach((menu) => {
    menu.classList.add("hidden");
    menu.style.display = "none";
    menu.style.top = "auto";
    menu.style.bottom = "auto";
  });

  document.querySelectorAll('[id^="table-arrow-"]').forEach((arrow) => {
    arrow.classList.remove("rotate-180");
  });
});


// ===== DOM ELEMENTS =====
const appointmentModal = document.getElementById("appointmentModal");
const addAppointmentBtn = document.getElementById("addAppointmentBtn");
const cancelModal = document.getElementById("cancelModal");
const closeModalCross = document.getElementById("closeModalCross");
const appointmentForm = document.getElementById("appointmentForm");
const appointmentTableBody = document.getElementById("appointmentTableBody");
const searchInput = document.getElementById("searchInput");
const patientSelect = document.getElementById("patientName");
const doctorSelect = document.getElementById("doctorName");
const modalTitle = document.getElementById("modalTitle");

// ===== EDIT MODE & CACHE SYSTEM =====
let editAppointmentId = null;
let currentSnapshot = null;
let allAppointments = {};
const userCache = new Map();

// ===== OPEN MODAL =====
addAppointmentBtn?.addEventListener("click", () => {
  appointmentForm?.reset();
  editAppointmentId = null;
  if (modalTitle) modalTitle.innerText = "Add Appointment";

  // Reset custom dropdown UI texts
  setCustomDropdownValue('patientCustomSelect', 'patientName', '', 'Select Patient');
  setCustomDropdownValue('doctorCustomSelect', 'doctorName', '', 'Select Doctor');
  setCustomDropdownValue('statusCustomSelect', 'appointmentStatus', '', 'Select Status');

  const dateInput = document.getElementById("appointmentDate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }

  appointmentModal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
});

// ===== CLOSE MODAL =====
const hideModal = () => {
  appointmentModal?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
};

// ===== EDIT APPOINTMENT =====
window.editAppointment = (id) => {
  const appointment = allAppointments[id];

  if (!appointment) return;

  editAppointmentId = id;
  if (modalTitle) modalTitle.innerText = "Edit Appointment";

  if (patientSelect) patientSelect.value = appointment.patientId || "";
  if (doctorSelect) doctorSelect.value = appointment.doctorId || "";

  // dropdown triggers text
  setCustomDropdownValue('patientCustomSelect', 'patientName', appointment.patientId || '', 'Select Patient');
  setCustomDropdownValue('doctorCustomSelect', 'doctorName', appointment.doctorId || '', 'Select Doctor');
  setCustomDropdownValue('statusCustomSelect', 'appointmentStatus', appointment.status || 'Pending', 'Select Status');

  const dateInput = document.getElementById("appointmentDate");
  const timeInput = document.getElementById("appointmentTime");
  const reasonInput = document.getElementById("appointmentReason");
  const statusInput = document.getElementById("appointmentStatus");

  // EDIT MODE
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];

    dateInput.value = appointment.date || "";

    if (appointment.date && appointment.date < today) {
      dateInput.min = appointment.date;
    } else {
      dateInput.min = today;
    }
  }

  if (timeInput) timeInput.value = appointment.time || "";
  if (reasonInput) reasonInput.value = appointment.reason || "";
  if (statusInput) statusInput.value = appointment.status || "Pending";

  appointmentModal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
};

cancelModal?.addEventListener("click", hideModal);
closeModalCross?.addEventListener("click", hideModal);

appointmentModal?.addEventListener("click", (e) => {
  if (e.target === appointmentModal) hideModal();
});

// ===== PATIENTS DROPDOWN =====
function loadDropdownPatients() {
  if (!patientSelect) return;

  const patientsMap = new Map();

  const renderPatientDropdown = () => {
    let options = `<option value="" disabled selected class="bg-slate-900 text-slate-400">Select Patient</option>`;
    patientsMap.forEach((name, id) => {
      options += `<option value="${id}" class="bg-slate-900 text-slate-200">${name}</option>`;
    });
    patientSelect.innerHTML = options;
    refreshCustomDropdown('patientName', 'patientDropdownMenu', 'Select Patient');
  };

  // Admin patient collection
  onSnapshot(collection(db, "patient"), (snapshot) => {
    snapshot.forEach((docSnap) => {
      const patient = docSnap.data();
      const pName = patient.fullName || patient.name || "Patient";
      patientsMap.set(docSnap.id, pName);
      userCache.set(docSnap.id, pName);
    });
    renderPatientDropdown();
  });

  // users collection with role patient
  onSnapshot(collection(db, "users"), (snapshot) => {
    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      if (u.role === "patient") {
        const pName = u.fullName || u.name || (u.email ? u.email.split('@')[0] : "Patient");
        patientsMap.set(docSnap.id, pName);
        userCache.set(docSnap.id, pName);
      }
    });
    renderPatientDropdown();
  });
}
loadDropdownPatients();

// ===== DOCTORS DROPDOWN =====
function loadDropdownDoctors() {
  if (!doctorSelect) return;

  const doctorsMap = new Map();

  const renderDoctorDropdown = () => {
    let options = `<option value="" disabled selected class="bg-slate-900 text-slate-400">Select Doctor</option>`;
    doctorsMap.forEach((name, id) => {
      options += `<option value="${id}" class="bg-slate-900 text-slate-200">${name}</option>`;
    });
    doctorSelect.innerHTML = options;
    refreshCustomDropdown('doctorName', 'doctorDropdownMenu', 'Select Doctor');
  };

  // Admin doctor collection
  onSnapshot(collection(db, "doctor"), (snapshot) => {
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const docName = d.fullName ? (d.fullName.startsWith("Dr.") ? d.fullName : `Dr. ${d.fullName}`) : (d.email ? `Dr. ${d.email.split('@')[0]}` : "Doctor");
      doctorsMap.set(docSnap.id, docName);
      userCache.set(docSnap.id, docName);
    });
    renderDoctorDropdown();
  });

  // users collection with role doctor
  onSnapshot(collection(db, "users"), (snapshot) => {
    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      if (u.role === "doctor") {
        const docName = u.fullName ? (u.fullName.startsWith("Dr.") ? u.fullName : `Dr. ${u.fullName}`) : `Dr. ${u.email ? u.email.split('@')[0] : "Doctor"}`;
        doctorsMap.set(docSnap.id, docName);
        userCache.set(docSnap.id, docName);
      }
    });
    renderDoctorDropdown();
  });
}
loadDropdownDoctors();

// Initialize dropdown triggers listeners
setupCustomDropdown('patientCustomSelect', 'patientDropdownMenu', 'patientName');
setupCustomDropdown('doctorCustomSelect', 'doctorDropdownMenu', 'doctorName');
setupCustomDropdown('statusCustomSelect', 'statusDropdownMenu', 'appointmentStatus');

// ===== SUBMIT APPOINTMENT FORM (ADD / UPDATE) =====
appointmentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const pSelect = document.getElementById("patientName");
  const dSelect = document.getElementById("doctorName");

  const selectedPatientName = pSelect?.options[pSelect.selectedIndex]?.text || "";
  const selectedDoctorName = dSelect?.options[dSelect.selectedIndex]?.text || "";

  const appointmentData = {
    patientId: pSelect?.value || "",
    patientName: selectedPatientName,
    doctorId: dSelect?.value || "",
    doctor: selectedDoctorName,
    date: document.getElementById("appointmentDate")?.value || "",
    time: document.getElementById("appointmentTime")?.value || "",
    reason: document.getElementById("appointmentReason")?.value || "",
    status: document.getElementById("appointmentStatus")?.value || "Pending",
  };

  try {
    if (editAppointmentId) {
      await updateDoc(doc(db, "appointments", editAppointmentId), appointmentData);
      showSweetAlert("Updated!", "Appointment record updated successfully.", "success");
      editAppointmentId = null;
    } else {
      appointmentData.createdAt = serverTimestamp();
      await addDoc(collection(db, "appointments"), appointmentData);
      showSweetAlert("Added!", "New appointment scheduled successfully.", "success");
    }

    appointmentForm.reset();
    setCustomDropdownValue('patientCustomSelect', 'patientName', '', 'Select Patient');
    setCustomDropdownValue('doctorCustomSelect', 'doctorName', '', 'Select Doctor');
    setCustomDropdownValue('statusCustomSelect', 'appointmentStatus', '', 'Select Status');
    hideModal();
  } catch (error) {
    console.error("Appointment Save Error:", error);
    showSweetAlert("Error!", "Failed to save appointment. Please try again.", "error");
  }
});

// ===== REALTIME APPOINTMENTS LISTENER =====
const q = query(collection(db, "appointments"));
onSnapshot(q, (snapshot) => {
  currentSnapshot = snapshot;
  renderAppointments(snapshot);
});

// ===== CACHED USER RESOLVER =====
async function getCachedName(collectionName, id, isDoctor = false) {
  if (!id) return null;
  if (userCache.has(id)) return userCache.get(id);

  try {
    let snap = await getDoc(doc(db, collectionName, id));
    if (!snap.exists() && collectionName !== "users") {
      snap = await getDoc(doc(db, "users", id));
    }
    if (snap.exists()) {
      const data = snap.data();
      let resolvedName = data.fullName || data.name || data.email || "N/A";
      if (isDoctor && !resolvedName.startsWith("Dr.")) {
        resolvedName = `Dr. ${resolvedName}`;
      }
      userCache.set(id, resolvedName);
      return resolvedName;
    }
  } catch (e) {
    console.error("Resolve error:", e);
  }
  return null;
}

// ===== RENDER TABLE FUNCTION =====
async function renderAppointments(snapshot) {
  if (!snapshot || !appointmentTableBody) return;

  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
  let rowsHtml = "";
  let count = 0;

  for (const docSnap of snapshot.docs) {
    const appointment = docSnap.data();
    const docId = docSnap.id;

    allAppointments[docId] = appointment;

    let finalPatientName = appointment.patientName;
    if (!finalPatientName || finalPatientName === "N/A" || finalPatientName === "Select Patient") {
      finalPatientName = (await getCachedName("patient", appointment.patientId)) || "Patient / Direct";
    }

    let finalDoctorName = appointment.doctor;
    if (!finalDoctorName || finalDoctorName === "N/A" || finalDoctorName === "Select Doctor") {
      finalDoctorName = (await getCachedName("doctor", appointment.doctorId, true)) || "Unassigned Doctor";
    }

    if (
      searchValue &&
      !finalPatientName.toLowerCase().includes(searchValue) &&
      !finalDoctorName.toLowerCase().includes(searchValue) &&
      !(appointment.status || "").toLowerCase().includes(searchValue)
    ) {
      continue;
    }

    count++;

    let appointmentDate = appointment.date || "";
    let appointmentTime = appointment.time || "";

    if (!appointmentDate && appointment.datetime) {
      const parts = appointment.datetime.split("T");
      appointmentDate = parts[0] || "";
      appointmentTime = parts[1] || "";
    }

    const currentStatus = appointment.status || "Pending";
    const statusLower = currentStatus.toLowerCase();

    //  Table Status Dropdown
    rowsHtml += `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 text-xs">
        <td class="py-4 px-6 text-center font-mono text-slate-500 font-semibold">
          #0${count}
        </td>

        <td class="py-4 px-6 text-cyan-400 font-semibold">
          ${finalPatientName}
        </td>

        <td class="py-4 px-6 text-slate-200 font-medium">
          ${finalDoctorName}
        </td>

        <td class="py-4 px-6 text-slate-300 whitespace-nowrap font-mono">
          ${appointmentDate || "N/A"}
        </td>

        <td class="py-4 px-6 text-slate-300 whitespace-nowrap font-mono">
          ${appointmentTime || "N/A"}
        </td>

        <!-- REASON COLUMN WITH COMPACT TOP HOVER -->
<td class="py-4 px-6 max-w-[180px] relative group">
  <div class="truncate text-slate-400 cursor-default font-medium">
    ${appointment.reason || "N/A"}
  </div>

  ${appointment.reason && appointment.reason.length > 25
        ? `<div class="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[9999] pointer-events-none">
        <div class="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-200 text-[11px] py-2.5 px-3 rounded-lg max-w-[200px] w-max shadow-xl transition-all">
          <p class="whitespace-normal break-words leading-snug text-slate-300 font-sans">
            ${appointment.reason}
          </p>
        </div>
        <div class="w-2 h-2 bg-slate-900 border-r border-b border-slate-700/80 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
       </div>`
        : ""
      }
</td>

<!-- Status Dropdown -->
<td class="py-4 px-6 text-center relative">
  <div
    class="relative inline-block text-left w-full max-w-[135px]"
    id="table-dropdown-wrapper-${docId}"
  >
    <button
      type="button"
      onclick="toggleTableRowDropdown('${docId}', event)"
      class="status-button w-full inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 transition-all duration-200 focus:outline-none shadow-sm cursor-pointer"
    >
      <span class="flex items-center gap-2">
        <span
          class="status-dot w-2 h-2 rounded-full ${statusLower === 'approved' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
        statusLower === 'pending' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' :
          'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
      }"
        ></span>

        <span
          class="status-label ${statusLower === 'approved' ? 'text-emerald-400' :
        statusLower === 'pending' ? 'text-amber-400' :
          'text-rose-400'
      } capitalize"
        >${currentStatus}</span>
      </span>

      <i
        class="fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200"
        id="table-arrow-${docId}"
      ></i>
    </button>

    <div
      id="table-menu-${docId}"
      class="hidden absolute right-0 w-full rounded-xl bg-slate-950/95 border border-slate-800 backdrop-blur-md shadow-2xl z-[9999] p-1.5 space-y-1 transition-all text-left"
    >
      <button
        type="button"
        onclick="selectTableRowStatus('${docId}', 'Approved', event)"
        class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors cursor-pointer"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        Approved
      </button>

      <button
        type="button"
        onclick="selectTableRowStatus('${docId}', 'Pending', event)"
        class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors cursor-pointer"
      >
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        Pending
      </button>

      <button
        type="button"
        onclick="selectTableRowStatus('${docId}', 'Rejected', event)"
        class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
      >
        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        Rejected
      </button>
    </div>
  </div>
</td>

        <td class="py-4 px-6 text-center">
          <div class="flex items-center justify-center gap-2">
            <button
              type="button"
              onclick="editAppointment('${docId}')"
              class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all flex items-center justify-center cursor-pointer" 
              title="Edit Appointment">
              <i class="fas fa-pencil text-xs"></i>
            </button>

            <button
              type="button"
              onclick="deleteAppointment('${docId}')"
              class="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center cursor-pointer" 
              title="Delete">
              <i class="fas fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  if (count === 0) {
    appointmentTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-12 text-slate-500 font-medium">
          <div class="flex flex-col items-center justify-center gap-2">
            <i class="fas fa-calendar-xmark text-3xl text-slate-600 mb-1"></i>
            <span>No Appointments Found</span>
          </div>
        </td>
      </tr>
    `;
  } else {
    appointmentTableBody.innerHTML = rowsHtml;
  }
}

// SEARCH LISTENER
searchInput?.addEventListener("input", () => {
  if (currentSnapshot) renderAppointments(currentSnapshot);
});

// ===== DELETE APPOINTMENT =====
window.deleteAppointment = async (id) => {
  let confirmDelete = false;

  if (typeof Swal !== "undefined") {
    const result = await Swal.fire({
      title: "Delete Appointment?",
      text: "Are you sure you want to delete this Appointment permanently?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f43f5e",
      cancelButtonColor: "#334155",
      confirmButtonText: "Confirm Delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#f8fafc",
    });
    confirmDelete = result.isConfirmed;
  } else {
    confirmDelete = confirm("Are you sure you want to delete this appointment?");
  }

  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "appointments", id));
    showSweetAlert("Deleted!", "Appointment record removed.", "success");
  } catch (error) {
    console.error("Delete Error:", error);
    showSweetAlert("Failed!", "Could not delete appointment.", "error");
  }
};

// ===== CHANGE STATUS REALTIME =====
window.changeStatus = async (id, value) => {
  try {
    await updateDoc(doc(db, "appointments", id), {
      status: value,
    });
  } catch (error) {
    console.error("Status Update Error:", error);
    showSweetAlert("Failed!", "Could not update appointment status.", "error");
  }
};

// ===== SWEETALERT UTILITY =====
function showSweetAlert(title, text, icon = "success") {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      title,
      text,
      icon,
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: icon === "error" ? "#f43f5e" : "#06b6d4",
      timer: icon === "success" ? 2000 : undefined,
      showConfirmButton: icon !== "success",
    });
  } else {
    alert(`${title}: ${text}`);
  }
}

// ===== VIEW REASON POPUP =====
window.viewReason = (reasonText) => {
  if (!reasonText || reasonText === "N/A") return;

  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "Appointment Reason",
      text: reasonText,
      icon: "info",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#06b6d4",
      confirmButtonText: "Close"
    });
  } else {
    alert(`Appointment Reason:\n\n${reasonText}`);
  }
};