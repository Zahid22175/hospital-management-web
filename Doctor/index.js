import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp
} from "../firebase.js";

import { EmailAuthProvider, reauthenticateWithCredential, updatePassword }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const appointmentsTable = document.getElementById("appointmentsTable");
const logoutBtn = document.getElementById("logoutBtn");
const searchInput = document.getElementById("searchInput");

// Dropdown Elements
const statusFilter = document.getElementById("statusFilter");
const statusFilterBtn = document.getElementById("statusFilterBtn");
const statusFilterMenu = document.getElementById("statusFilterMenu");
const statusFilterArrow = document.getElementById("statusFilterArrow");
const statusFilterSelected = document.getElementById("statusFilterSelected");
const statusOptions = document.querySelectorAll(".status-option");

const currentDoctorNameElem = document.getElementById("currentDoctorName");

// Stats Elements
const statPending = document.getElementById("statPending");
const statApproved = document.getElementById("statApproved");
const statTotal = document.getElementById("statTotal");

// Mobile Drawer Controls
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Prescription Modal Elements
const prescriptionModal = document.getElementById("prescriptionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const prescriptionForm = document.getElementById("prescriptionForm");

const modalAppId = document.getElementById("modalAppId");
const modalPatientId = document.getElementById("modalPatientId");
const prescriptionDate = document.getElementById("prescriptionDate");

// Modal Custom Dropdown Elements
const patientSelect = document.getElementById("patientSelect");
const patientSelectBtn = document.getElementById("patientSelectBtn");
const patientSelectMenu = document.getElementById("patientSelectMenu");
const patientSelectArrow = document.getElementById("patientSelectArrow");
const patientSelectSelected = document.getElementById("patientSelectSelected");
const patientSelectOptionsList = document.getElementById("patientSelectOptionsList");

const doctorSelect = document.getElementById("doctorSelect");
const doctorSelectBtn = document.getElementById("doctorSelectBtn");
const doctorSelectMenu = document.getElementById("doctorSelectMenu");
const doctorSelectArrow = document.getElementById("doctorSelectArrow");
const doctorSelectSelected = document.getElementById("doctorSelectSelected");
const doctorSelectOptionsList = document.getElementById("doctorSelectOptionsList");

const modalPatientNameInput = document.getElementById("modalPatientNameInput");

// Age / Gender & Address Inputs
const patientAgeGenderInput = document.getElementById("patientAgeGenderInput") || document.getElementById("patientAge") || document.querySelector("input[placeholder*='28 Yrs']");
const patientAddressInput = document.getElementById("patientAddressInput") || document.getElementById("patientAddress") || document.querySelector("input[placeholder*='Clifton']");

const medicinesContainer = document.getElementById("medicinesContainer") || document.getElementById("medicationsContainer");
const addMedRowBtn = document.getElementById("addMedicineBtn") || document.getElementById("addMedRowBtn");

// Profile & Password Elements
const passwordUpdateForm = document.getElementById("passwordUpdateForm");
const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");

const doctorProfileForm = document.getElementById("doctorProfileForm");
const doctorAvatarInput = document.getElementById("doctorAvatarInput");
const doctorAvatarPreview = document.getElementById("doctorAvatarPreview");
const headerDoctorAvatar = document.getElementById("headerDoctorAvatar");
const availabilityToggle = document.getElementById("availabilityToggle");
const removeAvatarBtn = document.getElementById("removeAvatarBtn");
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=Doctor&background=0891b2&color=fff&size=128";

let tempAvatarBase64 = "";
let isAvatarRemoved = false;

// Global Current Doctor Cache
let currentDoctorProfile = {
  uid: "",
  name: "",
  email: ""
};

// Local Store
let currentAppointmentsList = [];

// SIDEBAR HANDLERS
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

// DROPDOWN CLOSER
function closeAllDropdowns() {
  statusFilterMenu?.classList.add("hidden");
  statusFilterArrow?.classList.remove("rotate-180");

  patientSelectMenu?.classList.add("hidden");
  patientSelectArrow?.classList.remove("rotate-180");
  patientSelectBtn?.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/20");
  patientSelectBtn?.classList.add("border-slate-800");

  doctorSelectMenu?.classList.add("hidden");
  doctorSelectArrow?.classList.remove("rotate-180");
  doctorSelectBtn?.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/50");
  doctorSelectBtn?.classList.add("border-slate-800");

  document.querySelectorAll(".med-freq-menu, .med-timing-menu").forEach(m => m.classList.add("hidden"));
  document.querySelectorAll(".med-freq-btn i, .med-timing-btn i").forEach(i => i.classList.remove("rotate-180"));
  document.querySelectorAll(".med-freq-btn, .med-timing-btn").forEach(btn => {
    btn.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/50");
    btn.classList.add("border-slate-800");
  });
}

// DROPDOWN HANDLERS
if (statusFilterBtn) {
  statusFilterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !statusFilterMenu?.classList.contains("hidden");
    closeAllDropdowns();
    if (!isOpen) {
      statusFilterMenu?.classList.remove("hidden");
      statusFilterArrow?.classList.add("rotate-180");
    }
  });
}

statusOptions.forEach(option => {
  option.addEventListener("click", () => {
    const val = option.getAttribute("data-value");
    const text = option.textContent.trim();

    if (statusFilterSelected) statusFilterSelected.textContent = text;
    if (statusFilter) statusFilter.value = val;

    closeAllDropdowns();
    filterAndRenderTable();
  });
});

if (patientSelectBtn) {
  patientSelectBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !patientSelectMenu?.classList.contains("hidden");
    closeAllDropdowns();
    if (!isOpen) {
      patientSelectMenu?.classList.remove("hidden");
      patientSelectArrow?.classList.add("rotate-180");
      patientSelectBtn?.classList.remove("border-slate-800");
      patientSelectBtn?.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/50");
    }
  });
}

if (doctorSelectBtn) {
  doctorSelectBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !doctorSelectMenu?.classList.contains("hidden");
    closeAllDropdowns();
    if (!isOpen) {
      doctorSelectMenu?.classList.remove("hidden");
      doctorSelectArrow?.classList.add("rotate-180");
      doctorSelectBtn?.classList.remove("border-slate-800");
      doctorSelectBtn?.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/50");
    }
  });
}

document.addEventListener("click", () => {
  closeAllDropdowns();
});

function populateCustomDropdown(hiddenInput, selectedTextElem, optionsListElem, options, defaultVal, defaultText) {
  hiddenInput.value = defaultVal;
  selectedTextElem.textContent = defaultText;

  optionsListElem.innerHTML = "";
  options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-cyan-500/20 rounded-lg cursor-pointer transition-all flex items-center justify-between";
    div.innerHTML = `<span>${escapeHtml(opt.text)}</span>`;

    if (opt.value === defaultVal) {
      div.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
    }

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      hiddenInput.value = opt.value;
      selectedTextElem.textContent = opt.text;

      optionsListElem.querySelectorAll("div").forEach(el => {
        el.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
      });
      div.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");

      closeAllDropdowns();

      if (hiddenInput.id === "patientSelect" && modalPatientNameInput) {
        modalPatientNameInput.value = opt.text;
      }
    });

    optionsListElem.appendChild(div);
  });
}

function createMedicationRow(medName = "", dosage = "", frequency = "1-0-1 (BD)", duration = "", timing = "After Meal") {
  if (!medicinesContainer) return;

  const div = document.createElement("div");
  div.className = "flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#050811] p-2.5 rounded-xl border border-slate-800/80 med-row transition-all relative";

  div.innerHTML = `
    <input type="text" placeholder="Medicine Name (e.g. Paracetamol)" value="${escapeHtml(medName)}" required
      class="flex-1 min-w-[150px] bg-[#050811] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 med-name" />
    
    <input type="text" placeholder="e.g. 500 mg" value="${escapeHtml(dosage)}"
      class="w-24 bg-[#050811] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 med-dosage" />

    <div class="relative w-36">
      <input type="hidden" class="med-freq" value="${escapeHtml(frequency)}" />
      <div class="med-freq-btn w-full bg-[#050811] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition-all select-none">
        <span class="med-freq-selected">${escapeHtml(frequency)}</span>
        <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200"></i>
      </div>
      <div class="med-freq-menu hidden absolute left-0 right-0 top-full mt-1 bg-[#050811] border border-slate-800 rounded-lg shadow-2xl z-50 p-1">
        <div class="med-freq-list space-y-0.5">
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="1-0-1 (BD)">1-0-1 (BD)</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="1-0-0 (OD)">1-0-0 (OD)</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="1-1-1 (TDS)">1-1-1 (TDS)</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="0-0-1 (HS)">0-0-1 (HS)</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="PRN (As Needed)">PRN (As Needed)</div>
        </div>
      </div>
    </div>

    <input type="text" placeholder="e.g. 5 days" value="${escapeHtml(duration)}"
      class="w-24 bg-[#050811] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 med-duration" />

    <div class="relative w-36">
      <input type="hidden" class="med-timing" value="${escapeHtml(timing)}" />
      <div class="med-timing-btn w-full bg-[#050811] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition-all select-none">
        <span class="med-timing-selected">${escapeHtml(timing)}</span>
        <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200"></i>
      </div>
      <div class="med-timing-menu hidden absolute left-0 right-0 top-full mt-1 bg-[#050811] border border-slate-800 rounded-lg shadow-2xl z-50 p-1">
        <div class="med-timing-list space-y-0.5">
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="After Meal">After Meal</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="Before Meal">Before Meal</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="With Meal">With Meal</div>
          <div class="px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-md cursor-pointer transition" data-val="Empty Stomach">Empty Stomach</div>
        </div>
      </div>
    </div>

    <button type="button" class="remove-med-btn p-2 text-rose-500 hover:text-rose-400 transition cursor-pointer">
      <i class="fa-solid fa-trash-can text-xs"></i>
    </button>
  `;

  const freqBtn = div.querySelector(".med-freq-btn");
  const freqMenu = div.querySelector(".med-freq-menu");
  const freqInput = div.querySelector(".med-freq");
  const freqSelected = div.querySelector(".med-freq-selected");
  const freqIcon = freqBtn.querySelector("i");

  freqBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !freqMenu.classList.contains("hidden");
    closeAllDropdowns();
    if (!isOpen) {
      freqMenu.classList.remove("hidden");
      freqIcon.classList.add("rotate-180");
      freqBtn.classList.remove("border-slate-800");
      freqBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/50");
    }
  });

  div.querySelectorAll(".med-freq-list div").forEach(item => {
    if (item.getAttribute("data-val") === frequency) {
      item.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
    }
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = item.getAttribute("data-val");
      freqInput.value = val;
      freqSelected.textContent = val;

      div.querySelectorAll(".med-freq-list div").forEach(el => el.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold"));
      item.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");

      closeAllDropdowns();
    });
  });

  const timingBtn = div.querySelector(".med-timing-btn");
  const timingMenu = div.querySelector(".med-timing-menu");
  const timingInput = div.querySelector(".med-timing");
  const timingSelected = div.querySelector(".med-timing-selected");
  const timingIcon = timingBtn.querySelector("i");

  timingBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !timingMenu.classList.contains("hidden");
    closeAllDropdowns();
    if (!isOpen) {
      timingMenu.classList.remove("hidden");
      timingIcon.classList.add("rotate-180");
      timingBtn.classList.remove("border-slate-800");
      timingBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/50");
    }
  });

  div.querySelectorAll(".med-timing-list div").forEach(item => {
    if (item.getAttribute("data-val") === timing) {
      item.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
    }
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = item.getAttribute("data-val");
      timingInput.value = val;
      timingSelected.textContent = val;

      div.querySelectorAll(".med-timing-list div").forEach(el => el.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold"));
      item.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");

      closeAllDropdowns();
    });
  });

  div.querySelector(".remove-med-btn").addEventListener("click", () => {
    if (medicinesContainer.children.length > 1) {
      div.remove();
    } else {
      showPopup("Warning", "At least one medicine row is required.", "warning");
    }
  });

  medicinesContainer.appendChild(div);
}

if (addMedRowBtn) {
  addMedRowBtn.addEventListener("click", () => createMedicationRow());
}

// AUTHENTICATION & ROLE LISTENER
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "doctor") {
      alert("Unauthorized access! Doctor credentials required.");
      await signOut(auth);
      window.location.href = "../login/login.html";
      return;
    }

    const docData = userDoc.data();
    let doctorFullName = docData.fullName || docData.name || docData.doctorName || user.displayName;

    if (!doctorFullName) {
      doctorFullName = "Dr. " + user.email.split("@")[0];
    } else if (!doctorFullName.toLowerCase().startsWith("dr.")) {
      doctorFullName = `Dr. ${doctorFullName}`;
    }

    currentDoctorProfile = {
      uid: user.uid,
      name: doctorFullName,
      email: user.email
    };

    if (currentDoctorNameElem) {
      currentDoctorNameElem.textContent = currentDoctorProfile.name;
    }

    const savedAvatar = docData.avatarUrl || localStorage.getItem(`doctor_avatar_${user.uid}`);
    if (savedAvatar) {
      if (doctorAvatarPreview) doctorAvatarPreview.src = savedAvatar;
      if (headerDoctorAvatar) headerDoctorAvatar.src = savedAvatar;
    }
    if (docData.isAvailable !== undefined && availabilityToggle) {
      availabilityToggle.checked = docData.isAvailable;
    }

    listenForAppointments(user.uid, user.email);
  } catch (err) {
    console.error("Auth Exception:", err);
  }
});

// REALTIME APPOINTMENTS LISTENER
async function listenForAppointments(doctorAuthUid, doctorEmail) {
  let adminDoctorDocId = null;
  try {
    const docQuery = query(collection(db, "doctor"), where("email", "==", doctorEmail));
    const docSnap = await getDocs(docQuery);
    if (!docSnap.empty) {
      adminDoctorDocId = docSnap.docs[0].id;
    }
  } catch (err) {
    console.warn("Error resolving doctor collection ID:", err);
  }

  const appQuery = query(collection(db, "appointments"));

  onSnapshot(appQuery, async (snapshot) => {
    const matchingDocs = snapshot.docs.filter(docSnap => {
      const data = docSnap.data();
      return data.doctorId === doctorAuthUid || (adminDoctorDocId && data.doctorId === adminDoctorDocId);
    });

    currentAppointmentsList = await Promise.all(
      matchingDocs.map(async (appDoc) => {
        const data = appDoc.data();
        const appId = appDoc.id;

        let patientName = "Unknown Patient";
        if (data.patientId) {
          try {
            const pSnap = await getDoc(doc(db, "users", data.patientId));
            if (pSnap.exists()) {
              patientName = pSnap.data().fullName || pSnap.data().name || pSnap.data().email;
            }
          } catch (e) {
            console.error("Failed to fetch patient data:", e);
          }
        }

        let doctorName = data.doctorName || data.doctor || data.drName || currentDoctorProfile.name;

        return {
          id: appId,
          patientName,
          doctorName,
          date: data.date || "N/A",
          time: data.time || "N/A",
          reason: data.reason || "-",
          status: data.status || "pending",
          patientId: data.patientId || ""
        };
      })
    );

    updateStats();
    filterAndRenderTable();
  }, (error) => {
    console.error("Appointments snapshot listener failed:", error);
  });
}

// TABLE RENDERING & FILTERING
function renderTable(items) {
  if (!appointmentsTable) return;

  if (items.length === 0) {
    appointmentsTable.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-slate-500">
          <i class="fas fa-folder-open text-3xl mb-2 text-slate-600 block"></i>
          <p class="text-xs font-medium">No appointments.</p>
        </td>
      </tr>`;
    return;
  }

  appointmentsTable.innerHTML = "";

  items.forEach((item) => {
    let statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Pending
    </span>`;

    if (item.status === "approved") {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Approved
      </span>`;
    } else if (item.status === "rejected") {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Rejected
      </span>`;
    }

    let actionButtons = `
      <div class="flex items-center justify-center gap-2">
        <button onclick="updateStatus('${item.id}', 'approved')" title="Approve Appointment"
          class="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold rounded-lg border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1">
          <i class="fas fa-check text-[10px]"></i> Approve
        </button>
        <button onclick="updateStatus('${item.id}', 'rejected')" title="Reject Appointment"
          class="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-semibold rounded-lg border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1">
          <i class="fas fa-xmark text-[10px]"></i> Reject
        </button>
      </div>
    `;

    if (item.status === "approved") {
      actionButtons = `
        <div class="flex items-center justify-center">
          <button onclick="openPrescriptionModal('${item.id}', '${item.patientId}', '${escapeJsString(item.patientName)}')"
            class="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white text-xs font-semibold rounded-lg border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-cyan-500/20">
            <i class="fas fa-file-prescription"></i> Prescription
          </button>
        </div>
      `;
    } else if (item.status === "rejected") {
      actionButtons = `
        <div class="flex items-center justify-center">
          <span class="text-xs text-slate-500 italic">No actions available</span>
        </div>
      `;
    }

    const displayReason = escapeHtml(item.reason || "-");

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/30 transition-colors group";
    tr.innerHTML = `
      <td class="py-4 px-5 pl-6">
        <div class="font-semibold text-white tracking-tight text-sm">${escapeHtml(item.patientName)}</div>
      </td>
      <td class="py-4 px-4">
        <div class="text-cyan-400 font-medium text-xs flex items-center gap-1.5">
          <span>${escapeHtml(item.doctorName)}</span>
        </div>
      </td>
      <td class="py-4 px-4">
        <div class="flex flex-col text-xs font-mono">
          <span class="text-slate-200 font-semibold">${escapeHtml(item.date)}</span>
          <span class="text-slate-400 text-[11px]">${escapeHtml(item.time)}</span>
        </div>
      </td>

      <td class="py-4 px-4 relative group/reason">
        <p class="text-slate-300 text-xs line-clamp-2 leading-relaxed break-words font-medium max-w-[200px]">
          ${displayReason || "N/A"}
        </p>
        ${displayReason && displayReason.length > 25
        ? `<div class="hidden group-hover/reason:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[9999] pointer-events-none">
              <div class="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-lg text-xs text-slate-200 max-w-[220px] w-max shadow-xl transition-all">
                <p class="whitespace-normal break-words leading-relaxed text-slate-300 font-sans text-[11px]">
                  ${displayReason}
                </p>
              </div>
              <div class="w-2 h-2 bg-slate-900 border-r border-b border-slate-700/80 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
             </div>`
        : ""
      }
      </td>

      <td class="py-4 px-4 text-center">
        ${statusBadge}
      </td>
      <td class="py-4 px-5 pr-6 text-center">
        ${actionButtons}
      </td>
    `;
    appointmentsTable.appendChild(tr);
  });
}

function filterAndRenderTable() {
  const searchTerm = (searchInput?.value || "").toLowerCase().trim();
  const selectedStatus = (statusFilter?.value || "all").toLowerCase().trim();

  const filtered = currentAppointmentsList.filter(item => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm) ||
      item.doctorName.toLowerCase().includes(searchTerm) ||
      item.reason.toLowerCase().includes(searchTerm);

    const matchesStatus = selectedStatus === "all" || item.status.toLowerCase() === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  renderTable(filtered);
}

function updateStats() {
  if (statTotal) statTotal.textContent = currentAppointmentsList.length;
  if (statPending) statPending.textContent = currentAppointmentsList.filter(i => i.status.toLowerCase() === "pending").length;
  if (statApproved) statApproved.textContent = currentAppointmentsList.filter(i => i.status.toLowerCase() === "approved").length;
}

if (searchInput) searchInput.addEventListener("input", filterAndRenderTable);

// PRESCRIPTION HANDLERS
window.updateStatus = async (appId, newStatus) => {
  try {
    await updateDoc(doc(db, "appointments", appId), { status: newStatus });
  } catch (err) {
    showPopup("Update Failed!", err.message, "error");
  }
};

window.openPrescriptionModal = async (appId, patientId, patientName = "") => {
  if (prescriptionForm) prescriptionForm.reset();

  if (modalAppId) modalAppId.value = appId;
  if (modalPatientId) modalPatientId.value = patientId;
  if (modalPatientNameInput) modalPatientNameInput.value = patientName;
  if (prescriptionDate) prescriptionDate.value = new Date().toISOString().split("T")[0];

  populateCustomDropdown(
    patientSelect,
    patientSelectSelected,
    patientSelectOptionsList,
    [{ value: patientId, text: patientName }],
    patientId,
    patientName
  );

  populateCustomDropdown(
    doctorSelect,
    doctorSelectSelected,
    doctorSelectOptionsList,
    [{ value: currentDoctorProfile.uid, text: currentDoctorProfile.name }],
    currentDoctorProfile.uid,
    currentDoctorProfile.name
  );

  if (patientId) {
    try {
      const pSnap = await getDoc(doc(db, "users", patientId));
      if (pSnap.exists()) {
        const pData = pSnap.data();
        let ageStr = pData.age ? `${pData.age} Yrs` : "";
        let genderStr = pData.gender || "";
        let ageGenderDisplay = [ageStr, genderStr].filter(Boolean).join(" / ");

        if (patientAgeGenderInput) {
          patientAgeGenderInput.value = ageGenderDisplay || pData.patientAge || "";
        }
        if (patientAddressInput) {
          patientAddressInput.value = pData.address || pData.patientAddress || "";
        }
      }
    } catch (err) {
      console.warn("Could not fetch patient details for modal:", err);
    }
  }

  if (medicinesContainer) {
    medicinesContainer.innerHTML = "";
    createMedicationRow();
  }

  prescriptionModal?.classList.remove("hidden");
  prescriptionModal?.classList.add("flex");
};

function closePrescriptionModal() {
  prescriptionModal?.classList.add("hidden");
  prescriptionModal?.classList.remove("flex");
}

if (closeModalBtn) closeModalBtn.addEventListener("click", closePrescriptionModal);
if (cancelModalBtn) cancelModalBtn.addEventListener("click", closePrescriptionModal);

// PRESCRIPTION SUBMISSION
if (prescriptionForm) {
  prescriptionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const appId = modalAppId?.value || "";
    const patientId = modalPatientId?.value || "";

    if (!appId || !patientId) {
      showPopup("Invalid Data!", "Invalid Appointment or Patient Data!", "warning");
      return;
    }

    const medicineRows = document.querySelectorAll(".med-row");
    const medicinesList = [];

    medicineRows.forEach(row => {
      const name = row.querySelector(".med-name")?.value.trim();
      const dosage = row.querySelector(".med-dosage")?.value.trim();
      const frequency = row.querySelector(".med-freq")?.value;
      const duration = row.querySelector(".med-duration")?.value.trim();
      const timing = row.querySelector(".med-timing")?.value;

      if (name) {
        medicinesList.push({ name, dosage, frequency, duration, timing });
      }
    });

    if (medicinesList.length === 0) {
      showPopup("No Medications Added!", "Please add at least one medication before issuing.", "warning");
      return;
    }

    const vitalBP = document.getElementById("vitalBP")?.value.trim() || "";
    const vitalPulse = document.getElementById("vitalPulse")?.value.trim() || "";
    const vitalWeight = document.getElementById("vitalWeight")?.value.trim() || "";
    const vitalTemp = document.getElementById("vitalTemp")?.value.trim() || "";
    const diagnosis = document.getElementById("diagnosis")?.value.trim() || "";
    const labTests = document.getElementById("labTests")?.value.trim() || "";
    const instructions = document.getElementById("instructions")?.value.trim() || "";

    const ageGenderVal = patientAgeGenderInput?.value.trim() || "";
    const addressVal = patientAddressInput?.value.trim() || "";

    try {
      await addDoc(collection(db, "prescriptions"), {
        appointmentId: appId,
        patientId: patientId,
        patientName: modalPatientNameInput?.value || "Patient",
        patientAge: ageGenderVal,
        patientAddress: addressVal,
        doctorId: currentDoctorProfile.uid || auth.currentUser.uid,
        doctorName: currentDoctorProfile.name,
        date: prescriptionDate?.value || new Date().toISOString().split("T")[0],
        vitals: { bp: vitalBP, pulse: vitalPulse, weight: vitalWeight, temp: vitalTemp },
        diagnosis: diagnosis,
        medicines: medicinesList,
        inscription: medicinesList,
        labTests: labTests,
        instructions: instructions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      showPopup("Prescription Issued!", "Prescription has been issued and synced successfully.", "success");
      closePrescriptionModal();

    } catch (err) {
      console.error("Error saving prescription:", err);
      showPopup("Prescription Failed!", "Failed to save prescription: " + err.message, "error");
    }
  });
}

// SWEETALERT POPUP 
function showPopup(title, text, type = 'success') {
  let mainIconSvg = '';
  
  if (type === 'success') {
    // Green Circle with Smooth Checkmark
    mainIconSvg = `
      <div class="mx-auto my-2 flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20">
        <svg class="w-10 h-10 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>`;
  } else if (type === 'error') {
    // Red Circle for Errors
    mainIconSvg = `
      <div class="mx-auto my-2 flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/20">
        <svg class="w-10 h-10 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>`;
  } else {
    // Amber Circle for Warnings
    mainIconSvg = `
      <div class="mx-auto my-2 flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/20">
        <svg class="w-10 h-10 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>`;
  }

  return Swal.fire({
    html: `
      <div class="flex flex-col items-center text-center space-y-3 py-2">
        ${mainIconSvg}
        <h3 class="text-2xl font-bold tracking-tight text-white font-sans mt-2">${title}</h3>
        <p class="text-xs text-slate-300 font-medium leading-relaxed max-w-xs">${text}</p>
      </div>
    `,
    background: '#090d16',
    showConfirmButton: false, 
    timer: 2200,              // Smooth auto-close in 2.2 seconds
    timerProgressBar: false,
    width: '400px',
    padding: '2rem 1.5rem',
    customClass: {
      popup: 'border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-2xl'
    }
  });
}

// PASSWORD UPDATE FORM HANDLER
if (passwordUpdateForm) {
  passwordUpdateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPass = currentPasswordInput.value.trim();
    const newPass = newPasswordInput.value.trim();
    const confirmPass = confirmPasswordInput.value.trim();

    // 1. Password Mismatch
    if (newPass !== confirmPass) {
      await showPopup("Password Mismatch!", "New password credentials do not match. Please verify and try again.", "error");
      passwordUpdateForm.reset(); // Instant form clear
      return;
    }

    // 2. Weak Password
    if (newPass.length < 6) {
      await showPopup("Insufficient Length!", "Security policy requires password to be at least 6 characters.", "warning");
      passwordUpdateForm.reset(); // Instant form clear
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);

      // 3. Success Popup 
      await showPopup("Password Updated!", "Authentication credentials saved to medical database.", "success");
      passwordUpdateForm.reset(); // Form clear on success
    } catch (err) {
      let errorMsg = "Verification failed. Incorrect current password provided.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = "The current password entered is invalid.";
      }
      await showPopup("Authentication Failed!", errorMsg, "error");
      passwordUpdateForm.reset(); // Instant form clear on wrong password
    }
  });
}

// 2. DOCTOR AVATAR CHOOSE & REMOVE LOGIC
if (doctorAvatarInput) {
  doctorAvatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showPopup("File Too Large!", "Image size must be less than 2MB.", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        tempAvatarBase64 = event.target.result;
        isAvatarRemoved = false;
        if (doctorAvatarPreview) doctorAvatarPreview.src = tempAvatarBase64;
        if (headerDoctorAvatar) headerDoctorAvatar.src = tempAvatarBase64;
      };
      reader.readAsDataURL(file);
    }
  });
}

if (removeAvatarBtn) {
  removeAvatarBtn.addEventListener("click", () => {
    tempAvatarBase64 = "";
    isAvatarRemoved = true;
    if (doctorAvatarInput) doctorAvatarInput.value = "";
    if (doctorAvatarPreview) doctorAvatarPreview.src = DEFAULT_AVATAR;
    if (headerDoctorAvatar) headerDoctorAvatar.src = DEFAULT_AVATAR;

    showPopup("Image Reset", "Profile picture reset to default avatar preview.", "info");
  });
}

if (doctorProfileForm) {
  doctorProfileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const isAvailable = availabilityToggle ? availabilityToggle.checked : true;
    const updateData = { isAvailable };

    if (isAvatarRemoved) {
      updateData.avatarUrl = DEFAULT_AVATAR;
      localStorage.removeItem(`doctor_avatar_${user.uid}`);
    } else if (tempAvatarBase64) {
      updateData.avatarUrl = tempAvatarBase64;
      localStorage.setItem(`doctor_avatar_${user.uid}`, tempAvatarBase64);
    }

    showPopup("Profile Updated!", "Profile settings and display avatar saved successfully.", "success");

    updateDoc(doc(db, "users", user.uid), updateData).catch(err => {
      console.error("Firestore sync error:", err);
    });
  });
}

// LOGOUT HANDLER
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const result = await Swal.fire({
      title: "Sign Out?",
      text: "Are you sure you want to log out from Doctor Portal?",
      icon: "question",
      background: "#090d16",
      color: '#f8fafc',
      showCancelButton: true,
      confirmButtonColor: "#06b6d4",
      cancelButtonColor: "#334155",
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl'
      }
    });

    if (!result.isConfirmed) return;

    try {
      await signOut(auth);
      window.location.href = "../login/login.html";
    } catch (error) {
      showPopup("Logout Failed!", error.message, "error");
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsString(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function switchTabTo(targetId) {
  if (!targetId) return;

  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));

  const targetTabElem = document.getElementById(targetId);
  if (targetTabElem) {
    targetTabElem.classList.remove('hidden');
  } else {
    const defaultTab = document.getElementById('appointmentsTab');
    if (defaultTab) defaultTab.classList.remove('hidden');
    targetId = 'appointmentsTab';
  }

  document.querySelectorAll('.nav-link').forEach(nav => {
    const href = nav.getAttribute('href') || '';
    const icon = nav.querySelector('i');

    if (href.includes(targetId)) {
      nav.classList.add('bg-gradient-to-r', 'from-cyan-500/10', 'to-blue-500/10', 'text-cyan-400', 'border', 'border-cyan-500/20', 'font-semibold');
      nav.classList.remove('text-slate-400', 'hover:bg-slate-800/60', 'hover:text-slate-100');

      if (icon) {
        icon.style.color = '#22d3ee';
        icon.classList.remove('text-slate-500');
        icon.classList.add('text-cyan-400');
      }
    } else {
      nav.classList.remove('bg-gradient-to-r', 'from-cyan-500/10', 'to-blue-500/10', 'text-cyan-400', 'border', 'border-cyan-500/20', 'font-semibold');
      nav.classList.add('text-slate-400', 'hover:bg-slate-800/60', 'hover:text-slate-100');

      if (icon) {
        icon.style.color = '';
        icon.classList.remove('text-cyan-400');
        icon.classList.add('text-slate-500');
      }
    }
  });
}

// Password Eye Toggles Functionality
document.querySelectorAll('.toggle-password-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const icon = btn.querySelector('i');
    if (input && input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    } else if (input) {
      input.type = 'password';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    }
  });
});

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTab = urlParams.get('tab') || 'appointmentsTab';

  switchTabTo(urlTab);
});