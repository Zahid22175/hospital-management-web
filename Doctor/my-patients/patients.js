import {
    auth,
    db,
    signOut,
    collection,
    query,
    where,
    onSnapshot,
    onAuthStateChanged
} from "../../firebase.js";

// DOM Elements
const tableBody = document.getElementById("myPatientsTableBody");
const searchInput = document.getElementById("patientSearchInput");
const totalPatientsCount = document.getElementById("totalPatientsCount");
const recentVisitsCount = document.getElementById("recentVisitsCount");
const totalRxCount = document.getElementById("totalRxCount");

// Modal Elements
const historyModal = document.getElementById("patientHistoryModal");
const closeHistoryModal = document.getElementById("closeHistoryModal");
const modalPatientName = document.getElementById("modalPatientName");
const modalPatientSub = document.getElementById("modalPatientSub");
const historyTimeline = document.getElementById("historyTimeline");

let myPatientsMap = {};
let rawPrescriptions = [];

closeHistoryModal?.addEventListener("click", () => {
    historyModal?.classList.add("hidden");
    historyModal?.classList.remove("flex");
});

// ===== LOGOUT SYSTEM =====
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            if (typeof Swal === "undefined") {
                console.error("SweetAlert2 script missing hai!");
                return;
            }

            const result = await Swal.fire({
                title: "Sign Out?",
                text: "Are you sure you want to log out of the patient panel?",
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
});

// Auth Guard & Init
onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
        fetchDoctorPatients(currentUser.uid);
    } else {
        window.location.href = "../login/login.html";
    }
});

function fetchDoctorPatients(doctorUid) {

    // Fetch Prescriptions created by this doctor
    const rxQuery = query(
        collection(db, "prescriptions"),
        where("doctorId", "==", doctorUid)
    );

    onSnapshot(rxQuery, (rxSnap) => {
        rawPrescriptions = [];
        myPatientsMap = {};

        rxSnap.forEach((docSnap) => {
            const rx = { id: docSnap.id, ...docSnap.data() };
            rawPrescriptions.push(rx);

            const pId = rx.patientId || rx.patientName || "unknown_patient";

            if (!myPatientsMap[pId]) {
                myPatientsMap[pId] = {
                    patientId: rx.patientId || "",
                    name: rx.patientName || "Patient",
                    phone: rx.patientPhone || "N/A",
                    gender: rx.gender || "N/A",
                    visitsCount: 1,
                    lastVisit: rx.date || "N/A",
                    lastDiagnosis: rx.diagnosis || "General Checkup",
                    records: [rx]
                };
            } else {
                myPatientsMap[pId].visitsCount += 1;
                myPatientsMap[pId].records.push(rx);
                if (rx.date && rx.date > myPatientsMap[pId].lastVisit) {
                    myPatientsMap[pId].lastVisit = rx.date;
                    myPatientsMap[pId].lastDiagnosis = rx.diagnosis || myPatientsMap[pId].lastDiagnosis;
                }
            }
        });

        // Fetch Patients details
        onSnapshot(collection(db, "users"), (usersSnap) => {
            usersSnap.forEach((uDoc) => {
                const userData = uDoc.data();
                if (myPatientsMap[uDoc.id]) {
                    myPatientsMap[uDoc.id].phone = userData.phone || userData.phoneNumber || myPatientsMap[uDoc.id].phone;
                    myPatientsMap[uDoc.id].gender = userData.gender || myPatientsMap[uDoc.id].gender;
                }
            });

            updateStats();
            renderPatientsTable(Object.values(myPatientsMap));
        });
    });
}

// Render Stats Cards
function updateStats() {
    const patientsArray = Object.values(myPatientsMap);
    if (totalPatientsCount) totalPatientsCount.innerText = patientsArray.length;
    if (totalRxCount) totalRxCount.innerText = rawPrescriptions.length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCount = rawPrescriptions.filter(r => {
        if (!r.date) return false;
        return new Date(r.date) >= thirtyDaysAgo;
    }).length;

    if (recentVisitsCount) recentVisitsCount.innerText = recentCount;
}

// Render Main Table
function renderPatientsTable(list) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">No patients assigned to you yet.</td></tr>`;
        return;
    }

    list.forEach((p) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/40 transition-colors border-b border-slate-800/50";
        tr.innerHTML = `
            <td class="py-4 px-6 font-semibold text-white flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                    ${p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div>${p.name}</div>
                    <span class="text-[10px] text-slate-500 font-mono">ID: ${p.patientId ? p.patientId.substring(0, 8) + '...' : 'N/A'}</span>
                </div>
            </td>
            <td class="py-4 px-6 text-slate-300">
                <div>${p.phone}</div>
                <span class="text-[10px] text-slate-500 capitalize">${p.gender}</span>
            </td>
            <td class="py-4 px-6 text-cyan-400 font-medium">${p.lastDiagnosis}</td>
            <td class="py-4 px-6">
                <span class="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    ${p.visitsCount} Consultations
                 </span>
            </td>
            <td class="py-4 px-6 text-slate-400 text-xs">${p.lastVisit}</td>
            <td class="py-4 px-6 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="window.viewPatientHistory('${p.patientId || p.name}')" class="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                        <i class="fa-solid fa-clock-rotate-left"></i> History
                    </button>
                    <button onclick="window.createRxForPatient('${p.patientId}')" class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center cursor-pointer" title="New Prescription">
                        <i class="fa-solid fa-plus text-xs"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Search Filter Listener
searchInput?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = Object.values(myPatientsMap).filter(p =>
        p.name.toLowerCase().includes(q) || p.phone.toLowerCase().includes(q) || p.lastDiagnosis.toLowerCase().includes(q)
    );
    renderPatientsTable(filtered);
});

// View Full Medical History Modal
window.viewPatientHistory = (key) => {
    const patient = myPatientsMap[key] || Object.values(myPatientsMap).find(p => p.name === key);
    if (!patient) return;

    if (modalPatientName) modalPatientName.innerText = `${patient.name}'s Medical Timeline`;
    if (modalPatientSub) modalPatientSub.innerText = `Contact: ${patient.phone} | Gender: ${patient.gender}`;

    if (historyTimeline) {
        historyTimeline.innerHTML = "";

        const sortedRx = patient.records.sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedRx.forEach((rx) => {
            const meds = rx.inscription || rx.medicines || [];
            let medsList = meds.map(m => `<span class="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">${m.name} (${m.dosage})</span>`).join(" ");

            const card = document.createElement("div");
            card.className = "p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 relative pl-6 border-l-2 border-l-cyan-500";
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-bold text-white text-xs">${rx.diagnosis || "General Consult"}</span>
                    <span class="text-[10px] text-cyan-400 font-mono">${rx.date || 'N/A'}</span>
                </div>
                <div class="text-xs text-slate-400"><strong>Vitals:</strong> BP: ${rx.vitals?.bp || 'N/A'} | Pulse: ${rx.vitals?.pulse || 'N/A'} | Weight: ${rx.vitals?.weight || 'N/A'}</div>
                <div class="flex flex-wrap gap-1 pt-1">${medsList || '<span class="text-slate-500 italic">No meds assigned</span>'}</div>
                ${rx.instructions ? `<p class="text-[11px] text-slate-400 italic mt-1">Note: ${rx.instructions}</p>` : ''}
            `;
            historyTimeline.appendChild(card);
        });
    }

    historyModal?.classList.remove("hidden");
    historyModal?.classList.add("flex");
};

// Quick Create Rx Action
window.createRxForPatient = (patientId) => {
    window.location.href = `../../Doctor/prescriptions/prescription.html?patientId=${patientId}`;
};

// Hamburger Button
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarOverlay.classList.toggle('hidden');
}

mobileMenuBtn?.addEventListener('click', toggleSidebar);
closeSidebarBtn?.addEventListener('click', toggleSidebar);
sidebarOverlay?.addEventListener('click', toggleSidebar);


