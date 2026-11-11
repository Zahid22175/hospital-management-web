import {
    auth,
    db,
    signOut,
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    onAuthStateChanged
} from "../../firebase.js";

// GLOBAL FLOATING TOOLTIP ENGINE 
let activeRxTooltip = null;
let rxTooltipHideTimer = null;

window.showRxTooltip = (e, medicinesArr) => {
    if (!medicinesArr || !Array.isArray(medicinesArr) || medicinesArr.length === 0) return;
    if (rxTooltipHideTimer) clearTimeout(rxTooltipHideTimer);

    let tooltip = document.getElementById("global-rx-tooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "global-rx-tooltip";
        tooltip.className = "fixed z-[999999] w-72 p-3.5 rounded-2xl bg-[#0b1329]/95 backdrop-blur-xl border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-150 transform scale-95 opacity-0";

        tooltip.addEventListener("mouseenter", () => {
            if (rxTooltipHideTimer) clearTimeout(rxTooltipHideTimer);
        });
        tooltip.addEventListener("mouseleave", () => {
            window.hideRxTooltip();
        });
        document.body.appendChild(tooltip);
    }

    const fullListHtml = medicinesArr.map((m, i) => {
        const name = typeof m === 'object' ? (m.name || m.medicineName || 'Medicine') : m;
        const dose = (typeof m === 'object' && m.dosage) ? `<span class='text-cyan-400 font-mono text-[11px] ml-1'>${m.dosage}</span>` : '';
        const freq = (typeof m === 'object' && m.frequency) ? `<span class='text-slate-400 text-[10px] ml-1'>[${m.frequency}]</span>` : '';
        return `<div class='py-1.5 border-b border-slate-800/80 last:border-0 flex items-center justify-between gap-3 text-xs text-slate-200'>
                <span><strong class="text-slate-500 font-normal mr-1">${i + 1}.</strong> ${name}</span>
                <div>${dose}${freq}</div>
              </div>`;
    }).join("");

    tooltip.innerHTML = `
      <div class="text-[10px] font-bold tracking-wider uppercase text-cyan-400 mb-2 flex items-center justify-between pb-1 border-b border-slate-800">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-pills text-cyan-400"></i> Prescribed Medicines</span>
        <span class="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">${medicinesArr.length} Total</span>
      </div>
      <div class="max-h-48 cursor-pointer overflow-y-auto custom-scrollbar">
        ${fullListHtml}
      </div>
    `;

    activeRxTooltip = tooltip;
    const rect = e.currentTarget.getBoundingClientRect();
    let topPos = rect.top - tooltip.offsetHeight - 6;

    if (topPos < 10) {
        topPos = rect.bottom + 6;
    }

    tooltip.style.top = `${topPos}px`;
    tooltip.style.left = `${rect.left}px`;

    setTimeout(() => {
        tooltip.classList.remove("scale-95", "opacity-0");
        tooltip.classList.add("scale-100", "opacity-100");
    }, 10);
};

window.hideRxTooltip = () => {
    if (rxTooltipHideTimer) clearTimeout(rxTooltipHideTimer);
    rxTooltipHideTimer = setTimeout(() => {
        const tooltip = document.getElementById("global-rx-tooltip");
        if (tooltip) {
            tooltip.classList.remove("scale-100", "opacity-100");
            tooltip.classList.add("scale-95", "opacity-0");
            setTimeout(() => {
                tooltip.remove();
                activeRxTooltip = null;
            }, 150);
        }
    }, 120);
};

// NOTIFICATION
const notify = {
    success: (title, text = "") => {
        if (window.Swal) {
            Swal.fire({
                icon: "success",
                title: title,
                text: text,
                background: "#0b1329",
                color: "#fff",
                confirmButtonColor: "#06b6d4",
                customClass: { popup: "border border-slate-800 rounded-3xl shadow-2xl" }
            });
        } else {
            notify.customToast(title, "success");
        }
    },
    error: (title, text = "") => {
        if (window.Swal) {
            Swal.fire({
                icon: "error",
                title: title,
                text: text,
                background: "#0b1329",
                color: "#fff",
                confirmButtonColor: "#f43f5e",
                customClass: { popup: "border border-slate-800 rounded-3xl shadow-2xl" }
            });
        } else {
            notify.customToast(title, "error");
        }
    },
    warn: (title, text = "") => {
        if (window.Swal) {
            Swal.fire({
                icon: "warning",
                title: title,
                text: text,
                background: "#0b1329",
                color: "#fff",
                confirmButtonColor: "#f59e0b",
                customClass: { popup: "border border-slate-800 rounded-3xl shadow-2xl" }
            });
        } else {
            notify.customToast(title, "warning");
        }
    },
    confirm: async (title, text) => {
        if (window.Swal) {
            const res = await Swal.fire({
                title: title,
                text: text,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#f43f5e",
                cancelButtonColor: "#1e293b",
                confirmButtonText: "Yes, Delete",
                cancelButtonText: "Cancel",
                background: "#0b1329",
                color: "#fff",
                customClass: { popup: "border border-slate-800 rounded-3xl shadow-2xl" }
            });
            return res.isConfirmed;
        }
        return window.confirm(`${title}\n${text}`);
    },
    customToast: (msg, type) => {
        const toast = document.createElement("div");
        const colorClass = type === "success" ? "border-cyan-500/50 text-cyan-400" : type === "error" ? "border-rose-500/50 text-rose-400" : "border-amber-500/50 text-amber-400";
        toast.className = `fixed bottom-5 right-5 z-[9999] px-5 py-3 rounded-2xl bg-[#0b1329]/95 border ${colorClass} text-xs font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-3`;
        toast.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-triangle-exclamation"}"></i> <span>${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.remove("translate-y-2", "opacity-0"), 10);
        setTimeout(() => {
            toast.classList.add("opacity-0", "translate-y-2");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// DOM ELEMENTS
const prescriptionModal = document.getElementById("prescriptionModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const prescriptionForm = document.getElementById("prescriptionForm");
const medicinesContainer = document.getElementById("medicinesContainer");
const addMedicineBtn = document.getElementById("addMedicineBtn");
const tableBody = document.getElementById("prescriptionTableBody");
const searchInput = document.getElementById("searchInput");
const modalTitle = document.querySelector("#prescriptionModal h3");

// Custom Dropdowns Elements
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

const patientGender = document.getElementById("patientGender");
const genderSelectBtn = document.getElementById("genderSelectBtn");
const genderSelectMenu = document.getElementById("genderSelectMenu");
const genderSelectArrow = document.getElementById("genderSelectArrow");
const genderSelectSelected = document.getElementById("genderSelectSelected");

// INPUT DOM ELEMENTS (AGE, ADDRESS)
const patientAgeInput = document.getElementById("patientAge");
const patientAddressInput = document.getElementById("patientAddress");

let allPrescriptions = [];
let doctorsMap = {};
let patientsMap = {};
let editingPrescriptionId = null;

if (document.getElementById("prescriptionDate")) {
    document.getElementById("prescriptionDate").value = new Date().toISOString().split("T")[0];
}

// DROPDOWN CLOSER ALL
function closeAllDropdowns() {

    // Hide menus
    patientSelectMenu?.classList.add("hidden");
    doctorSelectMenu?.classList.add("hidden");
    genderSelectMenu?.classList.add("hidden");

    // Reset arrows
    patientSelectArrow?.classList.remove("rotate-180");
    doctorSelectArrow?.classList.remove("rotate-180");
    genderSelectArrow?.classList.remove("rotate-180");

    // Reset Focus Borders to Default Border
    patientSelectBtn?.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/20");
    patientSelectBtn?.classList.add("border-slate-800");

    doctorSelectBtn?.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/20");
    doctorSelectBtn?.classList.add("border-slate-800");

    genderSelectBtn?.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/20");
    genderSelectBtn?.classList.add("border-slate-800");

    // Hide dynamic medicine rows dropdowns & reset borders
    document.querySelectorAll(".med-freq-menu, .med-timing-menu").forEach(m => m.classList.add("hidden"));
    document.querySelectorAll(".med-freq-btn i, .med-timing-btn i").forEach(i => i.classList.remove("rotate-180"));
    document.querySelectorAll(".med-freq-btn, .med-timing-btn").forEach(btn => {
        btn.classList.remove("border-cyan-500", "ring-1", "ring-cyan-500/20");
        btn.classList.add("border-slate-800");
    });
}

// Custom Dropdown Button Click Events
if (patientSelectBtn) {
    patientSelectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !patientSelectMenu?.classList.contains("hidden");
        closeAllDropdowns();
        if (!isOpen) {
            patientSelectMenu?.classList.remove("hidden");
            patientSelectArrow?.classList.add("rotate-180");

            patientSelectBtn.classList.remove("border-slate-800");
            patientSelectBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/20");
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

            doctorSelectBtn.classList.remove("border-slate-800");
            doctorSelectBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/20");
        }
    });
}

if (genderSelectBtn) {
    genderSelectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !genderSelectMenu?.classList.contains("hidden");
        closeAllDropdowns();
        if (!isOpen) {
            genderSelectMenu?.classList.remove("hidden");
            genderSelectArrow?.classList.add("rotate-180");

            // Add Cyan Focus Border & Ring Glow on Open
            genderSelectBtn.classList.remove("border-slate-800");
            genderSelectBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/20");
        }
    });
}

document.querySelectorAll(".gender-option").forEach(opt => {
    opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = opt.getAttribute("data-val");
        if (patientGender) patientGender.value = val;
        if (genderSelectSelected) genderSelectSelected.textContent = val;

        document.querySelectorAll(".gender-option").forEach(o => {
            o.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
        });
        opt.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");

        closeAllDropdowns();
    });
});

document.addEventListener("click", () => {
    closeAllDropdowns();
});

// Populate Custom Dropdown Helper Function
function populateCustomDropdown(hiddenInput, selectedTextElem, optionsListElem, options, defaultVal, defaultText, onSelectCallback) {
    hiddenInput.value = defaultVal || "";
    selectedTextElem.textContent = defaultText || "Select Option";

    optionsListElem.innerHTML = "";
    options.forEach(opt => {
        const div = document.createElement("div");
        div.className = "px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-cyan-500/20 rounded-lg cursor-pointer transition-all flex items-center justify-between";
        div.innerHTML = `<span>${opt.text}</span>`;

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

            if (onSelectCallback) onSelectCallback(opt.value);
        });

        optionsListElem.appendChild(div);
    });
}

// ===== LOGOUT SYSTEM =====
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            if (typeof Swal === "undefined") return;

            const result = await Swal.fire({
                title: "Sign Out?",
                text: "Are you sure you want to log out of the doctor panel?",
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
});

// OPEN MODAL FOR NEW PRESCRIPTION
function openModalForNew() {
    editingPrescriptionId = null;
    if (prescriptionForm) prescriptionForm.reset();
    if (document.getElementById("prescriptionDate")) {
        document.getElementById("prescriptionDate").value = new Date().toISOString().split("T")[0];
    }
    if (modalTitle) modalTitle.innerText = "Create New Prescription";

    if (genderSelectSelected) genderSelectSelected.textContent = "Select Gender";
    if (patientGender) patientGender.value = "";

    updatePatientDropdownUI();
    updateDoctorDropdownUI(auth.currentUser?.uid);

    if (medicinesContainer) medicinesContainer.innerHTML = "";
    addMedicineRow();
    prescriptionModal?.classList.remove("hidden");
    prescriptionModal?.classList.add("flex");
}

openModalBtn?.addEventListener("click", openModalForNew);
closeModalBtn?.addEventListener("click", () => {
    prescriptionModal?.classList.add("hidden");
    prescriptionModal?.classList.remove("flex");
});

function handlePatientSelection(pId) {
    if (pId && patientsMap[pId]) {
        const selectedPatient = patientsMap[pId];
        if (patientAgeInput) patientAgeInput.value = selectedPatient.age || selectedPatient.patientAge || "";

        const gVal = selectedPatient.gender || selectedPatient.patientGender || "Male";
        if (patientGender) patientGender.value = gVal;
        if (genderSelectSelected) genderSelectSelected.textContent = gVal;

        document.querySelectorAll(".gender-option").forEach(o => {
            if (o.getAttribute("data-val") === gVal) {
                o.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
            } else {
                o.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
            }
        });

        if (patientAddressInput) patientAddressInput.value = selectedPatient.address || selectedPatient.patientAddress || "";
    }
}

// DYNAMIC MEDICINE ROW GENERATOR
function addMedicineRow(name = "", dosage = "1 Tablet", frequency = "1-0-1", duration = "5 Days", timing = "After Meal") {
    if (!medicinesContainer) return;

    const rowId = `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const div = document.createElement("div");
    div.className = "p-3 rounded-2xl bg-[#080d1a] border border-slate-800/90 flex flex-col sm:flex-row items-center gap-2.5 transition-all med-row hover:border-slate-700/80 relative";
    div.id = rowId;

    div.innerHTML = `
      <input type="text" placeholder="Medicine Name" value="${name}" required class="med-name flex-1 bg-[#050811] border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 outline-none px-3 py-2.5 w-full sm:w-auto transition-colors">
      <input type="text" placeholder="Dosage" value="${dosage}" required class="med-dosage w-full sm:w-24 bg-[#050811] border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 outline-none px-3 py-2.5 transition-colors">
      
      <!-- Custom Frequency Dropdown -->
      <div class="relative w-full sm:w-36">
          <input type="hidden" class="med-frequency" value="${frequency}" />
          <div class="med-freq-btn w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 flex items-center justify-between cursor-pointer select-none transition-all">
              <span class="med-freq-selected">${frequency === "1-0-1" ? "1-0-1 (BD)" : frequency}</span>
              <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200"></i>
          </div>
          <div class="med-freq-menu hidden absolute left-0 right-0 top-full mt-1 bg-[#050811] border border-slate-800 rounded-xl shadow-2xl z-50 p-1">
              <div class="space-y-0.5">
                  <div class="med-freq-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="1-0-1">1-0-1 (BD)</div>
                  <div class="med-freq-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="1-1-1">1-1-1 (TDS)</div>
                  <div class="med-freq-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="0-0-1">0-0-1 (HS)</div>
                  <div class="med-freq-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="1-0-0">1-0-0 (OD)</div>
                  <div class="med-freq-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="As Needed">SOS (As Needed)</div>
              </div>
          </div>
      </div>

      <input type="text" placeholder="Duration" value="${duration}" required class="med-duration w-full sm:w-24 bg-[#050811] border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 outline-none px-3 py-2.5 transition-colors">
      
      <!-- Custom Timing Dropdown -->
      <div class="relative w-full sm:w-36">
          <input type="hidden" class="med-timing" value="${timing}" />
          <div class="med-timing-btn w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 flex items-center justify-between cursor-pointer select-none transition-all">
              <span class="med-timing-selected">${timing}</span>
              <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200"></i>
          </div>
          <div class="med-timing-menu hidden absolute left-0 right-0 top-full mt-1 bg-[#050811] border border-slate-800 rounded-xl shadow-2xl z-50 p-1">
              <div class="space-y-0.5">
                  <div class="med-timing-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="After Meal">After Meal</div>
                  <div class="med-timing-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="Before Meal">Before Meal</div>
                  <div class="med-timing-opt px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer" data-val="With Food">With Food</div>
              </div>
          </div>
      </div>

      <button type="button" onclick="window.removeMedicineRow('${rowId}')" class="text-rose-500/70 hover:text-rose-400 p-2 text-xs transition-colors cursor-pointer shrink-0">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    medicinesContainer.appendChild(div);

    // Frequency Dropdown
    const freqBtn = div.querySelector(".med-freq-btn");
    const freqMenu = div.querySelector(".med-freq-menu");
    const freqInput = div.querySelector(".med-frequency");
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
            freqBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/20");
        }
    });

    div.querySelectorAll(".med-freq-opt").forEach(opt => {
        if (opt.getAttribute("data-val") === frequency) {
            opt.classList.add("bg-cyan-500/20", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
        }
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            const val = opt.getAttribute("data-val");
            freqInput.value = val;
            freqSelected.textContent = opt.textContent;

            div.querySelectorAll(".med-freq-opt").forEach(o => o.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold"));
            opt.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");

            closeAllDropdowns();
        });
    });

    // Timing Dropdown
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
            timingBtn.classList.add("border-cyan-500", "ring-1", "ring-cyan-500/20");
        }
    });

    div.querySelectorAll(".med-timing-opt").forEach(opt => {
        if (opt.getAttribute("data-val") === timing) {
            opt.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
        }
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            const val = opt.getAttribute("data-val");
            timingInput.value = val;
            timingSelected.textContent = val;

            div.querySelectorAll(".med-timing-opt").forEach(o => o.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold"));
            opt.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");

            closeAllDropdowns();
        });
    });
}

window.removeMedicineRow = (id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
};

addMedicineBtn?.addEventListener("click", () => addMedicineRow());

// FETCH DATA ON AUTH CHANGE
onAuthStateChanged(auth, (user) => {
    if (user) {
        initRealtimeListeners(user);
    } else {
        window.location.href = "../login/login.html";
    }
});

function updatePatientDropdownUI() {
    const patientOpts = Object.values(patientsMap).map(p => ({ value: p.id, text: p.name }));
    populateCustomDropdown(
        patientSelect,
        patientSelectSelected,
        patientSelectOptionsList,
        patientOpts,
        patientSelect.value,
        patientSelect.value ? patientsMap[patientSelect.value]?.name : "Select Patient",
        handlePatientSelection
    );
}

function updateDoctorDropdownUI(currentUid) {
    const doctorOpts = Object.values(doctorsMap).map(d => ({ value: d.id, text: d.name }));
    const defaultDocId = doctorSelect.value || currentUid || "";
    populateCustomDropdown(
        doctorSelect,
        doctorSelectSelected,
        doctorSelectOptionsList,
        doctorOpts,
        defaultDocId,
        doctorsMap[defaultDocId]?.name || "Select Doctor"
    );
}

function initRealtimeListeners(currentUser) {
    
    // Patients Listener
    onSnapshot(collection(db, "users"), (snap) => {
        patientsMap = {};
        snap.forEach((d) => {
            const data = d.data();
            if (data.role === "patient") {
                const pName = data.fullName || data.patientName || data.name || data.email || "Patient";
                patientsMap[d.id] = { id: d.id, name: pName, ...data };
            }
        });
        updatePatientDropdownUI();
        renderPrescriptions(allPrescriptions);
    });

    // Doctors Listener
    onSnapshot(collection(db, "users"), (snap) => {
        doctorsMap = {};
        snap.forEach((d) => {
            const data = d.data();
            if (data.role === "doctor") {
                let dName = data.fullName || data.name || data.doctorName || data.email || "Doctor";
                if (!dName.toLowerCase().startsWith("dr")) {
                    dName = `Dr. ${dName}`;
                }
                doctorsMap[d.id] = { id: d.id, name: dName, ...data };
            }
        });
        updateDoctorDropdownUI(currentUser.uid);
        renderPrescriptions(allPrescriptions);
    });

    // Prescriptions Query
    const q = query(collection(db, "prescriptions"), where("doctorId", "==", currentUser.uid));

    onSnapshot(q, (snapshot) => {
        allPrescriptions = [];
        snapshot.forEach((d) => allPrescriptions.push({ id: d.id, ...d.data() }));
        renderPrescriptions(allPrescriptions);
    }, (error) => {
        console.error("Prescriptions loading error: ", error);
        onSnapshot(collection(db, "prescriptions"), (snapshot) => {
            allPrescriptions = [];
            snapshot.forEach((d) => allPrescriptions.push({ id: d.id, ...d.data() }));
            renderPrescriptions(allPrescriptions);
        });
    });
}

// RENDER PRESCRIPTIONS TABLE
function renderPrescriptions(list) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-slate-500 font-medium">No Prescriptions Available</td></tr>`;
        return;
    }

    list.forEach((item, index) => {
        let doctorDisplayName = item.doctorName || item.doctor || item.docName || "";
        if (!doctorDisplayName && item.doctorId && doctorsMap[item.doctorId]) {
            doctorDisplayName = doctorsMap[item.doctorId].name;
        }
        if (!doctorDisplayName) doctorDisplayName = "Dr. Unassigned";

        let patientDisplayName = item.patientName || item.patient || "";
        if (!patientDisplayName && item.patientId && patientsMap[item.patientId]) {
            patientDisplayName = patientsMap[item.patientId].name;
        }
        if (!patientDisplayName) patientDisplayName = "Patient";

        const diag = item.diagnosis || "General Checkup";
        const pDate = item.date || "N/A";
        const medicinesArr = item.inscription || item.medicines || [];

        let rxSummary = "";
        if (Array.isArray(medicinesArr) && medicinesArr.length > 0) {
            const firstMed = typeof medicinesArr[0] === 'object'
                ? (medicinesArr[0].name || medicinesArr[0].medicineName || 'Medicine')
                : medicinesArr[0];

            const firstDose = (typeof medicinesArr[0] === 'object' && medicinesArr[0].dosage)
                ? ` ${medicinesArr[0].dosage}`
                : '';

            const totalItems = medicinesArr.length;
            const jsonMeds = JSON.stringify(medicinesArr).replace(/"/g, '&quot;');

            rxSummary = `
              <div class="inline-flex items-center gap-2 max-w-[260px] cursor-pointer" 
                    onmouseenter="window.showRxTooltip(event, ${jsonMeds})" 
                    onmouseleave="window.hideRxTooltip()">
                <span class="font-medium text-slate-200 text-xs truncate">${firstMed}${firstDose}${totalItems > 1 ? ',...' : ''}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 whitespace-nowrap hover:bg-cyan-500 hover:text-slate-950 transition-all">
                  ${totalItems} Item(s)
                </span>
              </div>
            `;
        } else {
            rxSummary = `<span class="text-slate-500 italic text-xs">No medicines</span>`;
        }

        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/30 transition-colors border-b border-slate-800/40";
        tr.innerHTML = `
        <td class="py-4 px-6 font-mono text-xs text-slate-500">${String(index + 1).padStart(2, "0")}</td>
        <td class="py-4 px-6 font-semibold text-white text-sm">${patientDisplayName}</td>
        <td class="py-4 px-6 text-cyan-400 font-medium text-xs">${doctorDisplayName}</td>
        <td class="py-4 px-6 text-slate-400 text-xs">${diag}</td>
        <td class="py-4 px-6">${rxSummary}</td>
        <td class="py-4 px-6 text-slate-400 text-xs whitespace-nowrap font-mono">${pDate}</td>
        <td class="py-4 px-6 text-center">
          <div class="flex items-center justify-center gap-2">
            <button onclick="window.editPrescription('${item.id}')" class="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 transition-all flex items-center justify-center cursor-pointer" title="Edit">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="window.downloadPDF('${item.id}')" class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center cursor-pointer" title="Download PDF">
              <i class="fa-solid fa-file-pdf text-xs"></i>
            </button>
            <button onclick="window.deletePrescription('${item.id}')" class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center cursor-pointer" title="Delete">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      `;
        tableBody.appendChild(tr);
    });
}

// SAVE OR UPDATE PRESCRIPTION
prescriptionForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const patientId = patientSelect?.value || "";
    const doctorId = doctorSelect?.value || auth.currentUser?.uid || "";
    const patientName = patientsMap[patientId]?.name || "Patient";
    const doctorName = doctorsMap[doctorId]?.name || "Dr. Unassigned";

    const medicines = [];
    document.querySelectorAll(".med-row").forEach((row) => {
        const nameInput = row.querySelector(".med-name")?.value;
        if (nameInput && nameInput.trim() !== "") {
            medicines.push({
                name: nameInput.trim(),
                dosage: row.querySelector(".med-dosage")?.value || "",
                frequency: row.querySelector(".med-frequency")?.value || "",
                duration: row.querySelector(".med-duration")?.value || "",
                timing: row.querySelector(".med-timing")?.value || "After Meal"
            });
        }
    });

    if (medicines.length === 0) {
        notify.warn("Medicine Required", "Please enter at least one medicine item.");
        return;
    }

    const payload = {
        patientId: patientId,
        patientName: patientName,
        patientAge: patientAgeInput?.value || "",
        patientGender: patientGender?.value || "Male",
        patientAddress: patientAddressInput?.value || "",
        doctorId: doctorId,
        doctorName: doctorName,
        vitals: {
            bp: document.getElementById("vitalBP")?.value || "",
            pulse: document.getElementById("vitalPulse")?.value || "",
            weight: document.getElementById("vitalWeight")?.value || "",
            temp: document.getElementById("vitalTemp")?.value || ""
        },
        diagnosis: document.getElementById("diagnosis")?.value || "",
        date: document.getElementById("prescriptionDate")?.value || new Date().toISOString().split("T")[0],
        labTests: document.getElementById("labTests")?.value || "",
        instructions: document.getElementById("instructions")?.value || "",
        inscription: medicines,
        medicines: medicines,
        updatedAt: serverTimestamp(),
    };

    try {
        if (editingPrescriptionId) {
            await updateDoc(doc(db, "prescriptions", editingPrescriptionId), payload);
            notify.success("Updated Successfully", "Prescription details have been updated.");
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, "prescriptions"), payload);
            notify.success("Created Successfully", "New prescription has been issued.");
        }

        prescriptionForm.reset();
        prescriptionModal?.classList.add("hidden");
        prescriptionModal?.classList.remove("flex");
    } catch (err) {
        console.error(err);
        notify.error("Transaction Error", err.message);
    }
});

// SEARCH FILTER
searchInput?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allPrescriptions.filter(p => {
        const docName = p.doctorName || doctorsMap[p.doctorId]?.name || "";
        const patName = p.patientName || patientsMap[p.patientId]?.name || "";
        return patName.toLowerCase().includes(q) || docName.toLowerCase().includes(q) || (p.diagnosis || "").toLowerCase().includes(q);
    });
    renderPrescriptions(filtered);
});

// EDIT PRESCRIPTION
window.editPrescription = (id) => {
    const item = allPrescriptions.find(p => p.id === id);
    if (!item) return;

    editingPrescriptionId = id;
    if (modalTitle) modalTitle.innerText = "Edit Prescription";

    if (patientSelect) patientSelect.value = item.patientId || "";
    if (doctorSelect) doctorSelect.value = item.doctorId || "";

    updatePatientDropdownUI();
    updateDoctorDropdownUI(item.doctorId);

    if (patientAgeInput) patientAgeInput.value = item.patientAge || "";

    const gVal = item.patientGender || "Male";
    if (patientGender) patientGender.value = gVal;
    if (genderSelectSelected) genderSelectSelected.textContent = gVal;

    document.querySelectorAll(".gender-option").forEach(o => {
        if (o.getAttribute("data-val") === gVal) {
            o.classList.add("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
        } else {
            o.classList.remove("bg-cyan-500/10", "border", "border-cyan-500/30", "text-cyan-400", "font-bold");
        }
    });

    if (patientAddressInput) patientAddressInput.value = item.patientAddress || "";

    if (document.getElementById("vitalBP")) document.getElementById("vitalBP").value = item.vitals?.bp || "";
    if (document.getElementById("vitalPulse")) document.getElementById("vitalPulse").value = item.vitals?.pulse || "";
    if (document.getElementById("vitalWeight")) document.getElementById("vitalWeight").value = item.vitals?.weight || "";
    if (document.getElementById("vitalTemp")) document.getElementById("vitalTemp").value = item.vitals?.temp || "";

    if (document.getElementById("diagnosis")) document.getElementById("diagnosis").value = item.diagnosis || "";
    if (document.getElementById("prescriptionDate")) document.getElementById("prescriptionDate").value = item.date || "";
    if (document.getElementById("labTests")) document.getElementById("labTests").value = item.labTests || "";
    if (document.getElementById("instructions")) document.getElementById("instructions").value = item.instructions || "";

    if (medicinesContainer) medicinesContainer.innerHTML = "";
    const medicinesArr = item.inscription || item.medicines || [];
    if (Array.isArray(medicinesArr) && medicinesArr.length > 0) {
        medicinesArr.forEach(m => addMedicineRow(m.name || m.medicineName, m.dosage, m.frequency, m.duration, m.timing));
    } else {
        addMedicineRow();
    }

    prescriptionModal?.classList.remove("hidden");
    prescriptionModal?.classList.add("flex");
};

// DOWNLOAD PDF
window.downloadPDF = (id) => {
    const item = allPrescriptions.find(p => p.id === id);
    if (!item) return;

    const docName = item.doctorName || doctorsMap[item.doctorId]?.name || "Dr. Specialist";
    const patName = item.patientName || patientsMap[item.patientId]?.name || "Patient";

    const pdfDocName = document.getElementById("pdfDocName");
    const pdfDate = document.getElementById("pdfDate");
    const pdfPatientName = document.getElementById("pdfPatientName");

    const pdfPatientAge = document.getElementById("pdfPatientAge");
    const pdfPatientGender = document.getElementById("pdfPatientGender");
    const pdfPatientAddress = document.getElementById("pdfPatientAddress");

    const pdfDiagnosis = document.getElementById("pdfDiagnosis");
    const pdfVitals = document.getElementById("pdfVitals");
    const pdfLabTests = document.getElementById("pdfLabTests");
    const pdfInstructions = document.getElementById("pdfInstructions");

    if (pdfDocName) pdfDocName.innerText = docName;
    if (pdfDate) pdfDate.innerText = `Date: ${item.date || "N/A"}`;
    if (pdfPatientName) pdfPatientName.innerText = patName;

    if (pdfPatientAge) pdfPatientAge.innerText = item.patientAge || "N/A";
    if (pdfPatientGender) pdfPatientGender.innerText = item.patientGender || "N/A";
    if (pdfPatientAddress) pdfPatientAddress.innerText = item.patientAddress || "N/A";

    if (pdfDiagnosis) pdfDiagnosis.innerText = item.diagnosis || "N/A";

    const vitalsStr = item.vitals ? `${item.vitals.bp || 'N/A'} | ${item.vitals.pulse || 'N/A'} | ${item.vitals.weight || 'N/A'}` : "N/A";
    if (pdfVitals) pdfVitals.innerText = vitalsStr;

    if (pdfLabTests) pdfLabTests.innerText = item.labTests || "None Requested";
    if (pdfInstructions) pdfInstructions.innerText = item.instructions || "None";

    const medTable = document.getElementById("pdfMedicinesTable");
    if (medTable) {
        medTable.innerHTML = "";
        const medicinesArr = item.inscription || item.medicines || [];
        if (Array.isArray(medicinesArr)) {
            medicinesArr.forEach(m => {
                medTable.innerHTML += `
          <tr>
            <td class="p-2.5 font-bold text-slate-800">${m.name || m.medicineName || '-'}</td>
            <td class="p-2.5 text-slate-600">${m.dosage || '-'}</td>
            <td class="p-2.5 text-slate-600">${m.frequency || '-'}</td>
            <td class="p-2.5 text-slate-600">${m.duration || '-'}</td>
            <td class="p-2.5 text-slate-600">${m.timing || 'After Meal'}</td>
          </tr>
          `;
            });
        }
    }

    const element = document.getElementById("pdfTemplate");
    if (element && typeof html2pdf !== "undefined") {
        notify.customToast("Generating PDF Document...", "success");
        const opt = {
            margin: 0.3,
            filename: `Prescription_${patName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    } else {
        notify.error("Library Error", "PDF generator plugin is not loaded.");
    }
};

// DELETE PRESCRIPTION
window.deletePrescription = async (id) => {
    const isConfirmed = await notify.confirm("Delete Record?", "Are you sure you want to permanently delete this prescription?");

    if (isConfirmed) {
        try {
            await deleteDoc(doc(db, "prescriptions", id));
            notify.success("Deleted", "Prescription record has been deleted.");
        } catch (err) {
            notify.error("Delete Failed", err.message);
        }
    }
};

// Sidebar Controls
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const toggleBtn = document.getElementById('toggleSidebarBtn');
const closeBtn = document.getElementById('closeSidebarBtn');

function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
}

if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);