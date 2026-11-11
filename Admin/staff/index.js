import {
  db,
  auth,
  signOut,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
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
document.addEventListener("DOMContentLoaded", () => {
  const sidebarBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const closeBtn = document.getElementById("closeSidebarBtn");

  if (sidebarBtn && sidebar) {
    sidebarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("-translate-x-full");
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sidebar.classList.add("-translate-x-full");
      });
    }

    document.addEventListener("click", (e) => {
      if (window.innerWidth < 1024) {
        if (!sidebar.contains(e.target) && !sidebarBtn.contains(e.target)) {
          sidebar.classList.add("-translate-x-full");
        }
      }
    });

    sidebar.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
});

// ===== GLOBAL DROPDOWN CLOSE SYSTEM =====
let activePortalMenu = null;

window.closeAllDropdowns = () => {
  if (activePortalMenu) {
    activePortalMenu.remove();
    activePortalMenu = null;
  }
  document.querySelectorAll(".dropdown-list").forEach(list => {
    list.classList.add("hidden");
  });
  document.querySelectorAll(".chevron-icon").forEach(c => c.classList.remove("rotate-180"));
  document.querySelectorAll(".dropdown-selected").forEach(s => s.classList.remove("border-cyan-500/80", "ring-2", "ring-cyan-500/25"));
};

document.addEventListener("click", window.closeAllDropdowns);
window.addEventListener("resize", window.closeAllDropdowns);
document.getElementById("tableScrollContainer")?.addEventListener("scroll", window.closeAllDropdowns);

 // ===== TABLE DROPDOWN TOGGLE =====
 window.toggleTableDropdown = (headerEl, event) => {
  event?.stopPropagation();

  const dropdown = headerEl.closest(".custom-dropdown");
  if (!dropdown) return;

  const originalList = dropdown.querySelector(".dropdown-list");
  const chevron = headerEl.querySelector(".chevron-icon");

  if (!originalList) return;

  const isAlreadyOpen =
    activePortalMenu &&
    activePortalMenu.dataset.sourceId === headerEl.id;

  // Close existing dropdown first
  window.closeAllDropdowns();

  if (isAlreadyOpen) return;

  if (chevron) chevron.classList.add("rotate-180");

  headerEl.classList.add(
    "border-cyan-500/80",
    "ring-2",
    "ring-cyan-500/25"
  );

  // Create dropdown portal
  const portalList = originalList.cloneNode(true);
  portalList.classList.remove("hidden");
  portalList.dataset.sourceId = headerEl.id;

  const rect = headerEl.getBoundingClientRect();
  const gap = 6;
  const viewportPadding = 8;

  // Initial positioning for measuring the actual menu height
  portalList.style.position = "fixed";
  portalList.style.top = `${rect.bottom + gap}px`;
  portalList.style.bottom = "auto";
  portalList.style.left = `${rect.left}px`;
  portalList.style.width = `${rect.width}px`;
  portalList.style.zIndex = "999999";
  portalList.style.display = "block";
  portalList.style.visibility = "hidden";
  portalList.style.pointerEvents = "auto";
  portalList.style.maxHeight = "192px";
  portalList.style.overflowY = "auto";

  document.body.appendChild(portalList);

  // Measure available space on both sides of the selected field
  const menuHeight = portalList.getBoundingClientRect().height;
  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
  const spaceAbove = rect.top - gap - viewportPadding;

  // Open below if it fits; otherwise open above if there is more room
  const openAbove =
    spaceBelow < menuHeight && spaceAbove > spaceBelow;

  const availableSpace = openAbove ? spaceAbove : spaceBelow;

  portalList.style.maxHeight =
    `${Math.max(60, Math.min(192, availableSpace))}px`;

  // Measure again after applying the available height
  const finalHeight = portalList.getBoundingClientRect().height;

  if (openAbove) {
    // Keep dropdown immediately above the selected field
    portalList.style.top = `${Math.max(
      viewportPadding,
      rect.top - finalHeight - gap
    )}px`;
  } else {
    // Keep dropdown immediately below the selected field
    portalList.style.top = `${rect.bottom + gap}px`;
  }

  portalList.style.visibility = "visible";

  activePortalMenu = portalList;
};

// ===== SELECT OPTION FROM TABLE DROPDOWN =====
window.selectOption = (id, field, value) => {
  window.updateStaff(id, field, value);
};

// ===== MODAL DROPDOWN =====
window.toggleModalDropdown = (headerEl, event) => {
  event.stopPropagation();
  const dropdown = headerEl.closest(".custom-dropdown");
  if (!dropdown) return;

  const listEl = dropdown.querySelector(".dropdown-list");
  const chevron = headerEl.querySelector(".chevron-icon");
  const isHidden = listEl.classList.contains("hidden");

  window.closeAllDropdowns();

  if (isHidden) {
    listEl.classList.remove("hidden");
    if (chevron) chevron.classList.add("rotate-180");
    headerEl.classList.add("border-cyan-500/80", "ring-2", "ring-cyan-500/25");
  }
};

window.selectModalItem = (itemEl, event) => {
  event.stopPropagation();
  const dropdown = itemEl.closest(".custom-dropdown");
  if (!dropdown) return;

  const val = itemEl.getAttribute("data-value");
  const text = itemEl.textContent;
  const hiddenInput = dropdown.querySelector("input[type='hidden']");
  const selectedText = dropdown.querySelector(".selected-text");

  if (hiddenInput) {
    hiddenInput.value = val;
    hiddenInput.dispatchEvent(new Event('change'));
  }

  if (selectedText) {
    selectedText.textContent = text;
    selectedText.classList.remove("text-slate-500");
    selectedText.classList.add("text-white");
  }

  window.closeAllDropdowns();
};

// Helper function for Modal resets
function setCustomDropdownValue(wrapperIdOrElement, value, defaultText) {
  const wrapper = typeof wrapperIdOrElement === 'string'
    ? document.querySelector(`.custom-dropdown[data-name="${wrapperIdOrElement}"]`)
    : wrapperIdOrElement;

  if (!wrapper) return;

  const hiddenInput = wrapper.querySelector("input[type='hidden']");
  const selectedText = wrapper.querySelector(".selected-text");

  if (hiddenInput) hiddenInput.value = value || "";
  if (selectedText) {
    if (value) {
      selectedText.textContent = value;
      selectedText.classList.remove("text-slate-500");
      selectedText.classList.add("text-white");
    } else {
      selectedText.textContent = defaultText || "Select Option";
      selectedText.classList.remove("text-white");
      selectedText.classList.add("text-slate-500");
    }
  }
}

// ===== DASHBOARD COUNTERS =====
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
      }
    });
  }
}

// REALTIME COUNTERS
let usersDocCount = 0;
let adminDocCount = 0;
let usersPatCount = 0;
let directPatCount = 0;

const updateDoctorCount = () => { if (doctorCount) doctorCount.innerText = usersDocCount + adminDocCount; };
const updatePatientCount = () => { if (patientCount) patientCount.innerText = usersPatCount + directPatCount; };

onSnapshot(collection(db, "doctor"), (s) => { adminDocCount = s.size; updateDoctorCount(); });
onSnapshot(collection(db, "patient"), (s) => { directPatCount = s.size; updatePatientCount(); });

onSnapshot(collection(db, "users"), (s) => {
  let docC = 0, patC = 0, staffC = 0;
  s.forEach(d => {
    const data = d.data();
    if (data.role === "doctor") docC++;
    if (data.role === "patient") patC++;
    if (data.role === "staff") staffC++;
  });
  usersDocCount = docC;
  usersPatCount = patC;
  if (staffCount) staffCount.textContent = staffC;
  updateDoctorCount();
  updatePatientCount();
});

onSnapshot(collection(db, "appointments"), (snap) => { if (appointmentCount) appointmentCount.innerText = snap.size; });
onSnapshot(collection(db, "departments"), (snap) => { if (departmentCount) departmentCount.innerText = snap.size; });
onSnapshot(collection(db, "contacts"), (snapshot) => { if (messageCount) messageCount.textContent = snapshot.size; });

// ===== ELEMENTS =====
const modal = document.getElementById("addStaffModal");
const addBtn = document.getElementById("addStaffBtn");
const cancelModal = document.getElementById("cancelModal");
const closeModalCross = document.getElementById("closeModalCross");
const form = document.getElementById("addStaffForm");
const searchInput = document.getElementById("searchInput");
const staffTableBody = document.getElementById("staffTableBody");
const modalTitle = document.getElementById("modalTitle");

let editStaffId = null;
let currentSnapshot = null;

function getFirstLetter(name) {
  if (!name) return "S";
  return name.trim().charAt(0).toUpperCase();
}

// Modal Control
addBtn?.addEventListener("click", () => {
  if (form) form.reset();
  setCustomDropdownValue("sDesignation", "", "Select Designation");
  setCustomDropdownValue("sDepartment", "", "Select Department");
  setCustomDropdownValue("sShift", "", "Select Shift");
  setCustomDropdownValue("sStatus", "Active", "Active");

  editStaffId = null;
  if (modalTitle) modalTitle.innerText = "Add New Staff Member";
  modal?.classList.remove("hidden");
});

const hideModal = () => {
  modal?.classList.add("hidden");
  if (form) form.reset();
  editStaffId = null;
};

cancelModal?.addEventListener("click", hideModal);
closeModalCross?.addEventListener("click", hideModal);

// ===== ADD / UPDATE STAFF =====
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    fullName: document.getElementById("sName")?.value.trim() || "",
    designation: document.getElementById("sDesignation")?.value || "Receptionist",
    department: document.getElementById("sDepartment")?.value || "General",
    phone: document.getElementById("sPhone")?.value.trim() || "",
    shift: document.getElementById("sShift")?.value || "Morning",
    status: document.getElementById("sStatus")?.value || "Active",
    role: "staff"
  };

  try {
    if (editStaffId) {
      await updateDoc(doc(db, "users", editStaffId), data);
      Swal.fire({ title: "Staff Profile Updated!", icon: "success", background: "#0f172a", color: "#f8fafc", timer: 1500, showConfirmButton: false });
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "users"), data);
      Swal.fire({ title: "Staff Member Registered!", icon: "success", background: "#0f172a", color: "#f8fafc", timer: 1500, showConfirmButton: false });
    }
    hideModal();
  } catch (error) {
    console.error("Firestore Error:", error);
  }
});

// REALTIME TABLE DATA
const q = query(collection(db, "users"), where("role", "==", "staff"));
onSnapshot(q, (snap) => {
  currentSnapshot = snap;
  renderStaff(snap);
});

// RENDER TABLE
function renderStaff(snapshot) {
  if (!staffTableBody) return;
  staffTableBody.innerHTML = "";

  if (!snapshot || snapshot.empty) {
    staffTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500 font-medium">No staff members found.</td></tr>`;
    return;
  }
  let count = 0;
  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";

  snapshot.forEach((d) => {
    const s = d.data();
    const id = d.id;

    if (search && !s.fullName?.toLowerCase().includes(search)) return;

    count++;
    const safeData = encodeURIComponent(JSON.stringify(s));
    const singleLetter = getFirstLetter(s.fullName);

    staffTableBody.innerHTML += `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40">
        <td class="py-3 px-4 text-center text-slate-400 font-medium">${count}</td>

        <td class="py-3 px-4 font-semibold text-white">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
              ${singleLetter}
            </div>
            <span class="whitespace-nowrap">${s.fullName || 'N/A'}</span>
          </div>
        </td>

        <!-- Designation -->
        <td class="py-3 px-4">
          <div class="relative custom-dropdown w-full max-w-[160px]">
            <input type="hidden" id="select-designation-${id}" value="${s.designation || 'Receptionist'}">
            <div id="btn-desig-${id}" onclick="window.toggleTableDropdown(this, event)" class="dropdown-selected w-full bg-[#111827] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-medium flex items-center justify-between cursor-pointer focus:border-cyan-500 transition-all">
              <span class="selected-text truncate">${s.designation || 'Select Designation'}</span>
              <i class="fas fa-chevron-down text-slate-500 text-[10px] chevron-icon transition-transform duration-200"></i>
            </div>
            <div class="dropdown-list hidden bg-[#0b101d] border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-0.5">
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Receptionist')">Receptionist</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Accountant')">Accountant</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Office Assistant')">Office Assistant</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Hospital Manager')">Hospital Manager</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Lab Assistant')">Lab Assistant</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Pharmacy Assistant')">Pharmacy Assistant</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Ward Boy')">Ward Boy</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Security Guard')">Security Guard</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Cleaner')">Cleaner</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'designation', 'Maintenance Officer')">Maintenance Officer</div>
            </div>
          </div>
        </td>

        <!-- Department -->
        <td class="py-3 px-4">
          <div class="relative custom-dropdown w-full max-w-[150px]">
            <input type="hidden" id="select-department-${id}" value="${s.department || 'Cardiology'}">
            <div id="btn-dept-${id}" onclick="window.toggleTableDropdown(this, event)" class="dropdown-selected w-full bg-[#111827] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-medium flex items-center justify-between cursor-pointer focus:border-cyan-500 transition-all">
              <span class="selected-text truncate">${s.department || 'Select Department'}</span>
              <i class="fas fa-chevron-down text-slate-500 text-[10px] chevron-icon transition-transform duration-200"></i>
            </div>
            <div class="dropdown-list hidden bg-[#0b101d] border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-0.5">
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Cardiology')">Cardiology</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Skin')">Skin</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'ICU')">ICU</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Dentist')">Dentist</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Neurology')">Neurology</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Emergency')">Emergency</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'General Surgery')">General Surgery</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Radiology')">Radiology</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Pharmacy')">Pharmacy</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'department', 'Laboratory')">Laboratory</div>
            </div>
          </div>
        </td>

        <td class="py-3 px-4 text-slate-300 font-mono text-xs whitespace-nowrap">${s.phone || '-'}</td>

        <!-- Shift -->
        <td class="py-3 px-4">
          <div class="relative custom-dropdown w-full max-w-[130px]">
            <input type="hidden" id="select-shift-${id}" value="${s.shift || 'Morning'}">
            <div id="btn-shift-${id}" onclick="window.toggleTableDropdown(this, event)" class="dropdown-selected w-full bg-[#111827] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-medium flex items-center justify-between cursor-pointer focus:border-cyan-500 transition-all">
              <span class="selected-text truncate">${s.shift || 'Select Shift'}</span>
              <i class="fas fa-chevron-down text-slate-500 text-[10px] chevron-icon transition-transform duration-200"></i>
            </div>
            <div class="dropdown-list hidden bg-[#0b101d] border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-0.5">
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'shift', 'Morning')">Morning</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'shift', 'Evening')">Evening</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-xs text-white transition-colors" onclick="window.selectOption('${id}', 'shift', 'Night')">Night</div>
            </div>
          </div>
        </td>

        <!-- Status -->
        <td class="py-3 px-4">
          <div class="relative custom-dropdown w-full max-w-[120px]">
            <input type="hidden" id="select-status-${id}" value="${s.status || 'Active'}">
            <div id="btn-status-${id}" onclick="window.toggleTableDropdown(this, event)" class="dropdown-selected w-full px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all flex items-center justify-between ${s.status === "Active" ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30" :
        s.status === "Inactive" ? "bg-rose-950/60 text-rose-400 border-rose-500/30" :
          "bg-amber-950/60 text-amber-400 border-amber-500/30"
      }">
              <span class="selected-text truncate">${s.status || 'Active'}</span>
              <i class="fas fa-chevron-down text-[10px] chevron-icon transition-transform duration-200 opacity-75"></i>
            </div>
            <div class="dropdown-list hidden bg-[#0b101d] border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-0.5">
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer text-xs text-emerald-400 transition-colors" onclick="window.selectOption('${id}', 'status', 'Active')">Active</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer text-xs text-rose-400 transition-colors" onclick="window.selectOption('${id}', 'status', 'Inactive')">Inactive</div>
              <div class="dropdown-item px-2.5 py-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-400 cursor-pointer text-xs text-amber-400 transition-colors" onclick="window.selectOption('${id}', 'status', 'On Leave')">On Leave</div>
            </div>
          </div>
        </td>

        <td class="py-3 px-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-2">
            <button type="button" onclick="editStaff('${id}', '${safeData}')" title="Edit Staff"
              class="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-all flex items-center justify-center cursor-pointer">
              <i class="fas fa-pen text-xs"></i>
            </button>
            <button type="button" onclick="deleteStaff('${id}')" title="Delete Staff"
              class="w-7 h-7 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all flex items-center justify-center cursor-pointer">
              <i class="fas fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

// UPDATE STAFF IN FIREBASE
window.updateStaff = async (id, field, value) => {
  try {
    await updateDoc(doc(db, "users", id), { [field]: value });
    window.closeAllDropdowns();
  } catch (error) {
    console.error("Error updating field:", error);
  }
};

// SEARCH
searchInput?.addEventListener("input", () => {
  if (currentSnapshot) renderStaff(currentSnapshot);
});

// EDIT STAFF
window.editStaff = (id, staffEncoded) => {
  const staff = JSON.parse(decodeURIComponent(staffEncoded));
  editStaffId = id;

  const sName = document.getElementById("sName");
  if (sName) sName.value = staff.fullName || "";

  setCustomDropdownValue("sDesignation", staff.designation, "Select Designation");
  setCustomDropdownValue("sDepartment", staff.department, "Select Department");

  const sPhone = document.getElementById("sPhone");
  if (sPhone) sPhone.value = staff.phone || "";

  setCustomDropdownValue("sShift", staff.shift, "Select Shift");
  setCustomDropdownValue("sStatus", staff.status || "Active", "Active");

  if (modalTitle) modalTitle.innerText = "Edit Staff Member";
  modal?.classList.remove("hidden");
};

// DELETE STAFF
window.deleteStaff = async (id) => {
  const result = await Swal.fire({
    title: "Delete Staff Member?",
    text: "Are you sure you want to delete this staff member permanently?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#f43f5e",
    cancelButtonColor: "#334155",
    confirmButtonText: "Confirm Delete",
    cancelButtonText: "Cancel",
    background: "#0f172a",
    color: "#f8fafc"
  });

  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "users", id));
    Swal.fire({ title: "Deleted!", icon: "success", background: "#0f172a", color: "#f8fafc", timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error("Delete Error:", error);
  }
};