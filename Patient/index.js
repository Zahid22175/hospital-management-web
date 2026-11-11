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
    updateDoc
} from "../firebase.js";

import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const appointmentsTable = document.getElementById("patientAppointmentsTable");
const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".logout-btn");

// UI Elements
const patientWelcomeName = document.getElementById("patientWelcomeName");
const statPending = document.getElementById("statPending");
const statApproved = document.getElementById("statApproved");
const statTotal = document.getElementById("statTotal");

// Views DOM
const appointmentsView = document.getElementById("appointmentsView");
const securityView = document.getElementById("securityView");

// Nav Buttons
const navAppointmentsBtn = document.getElementById("navAppointmentsBtn");
const navSecurityBtn = document.getElementById("navSecurityBtn");

// Search & Filter Inputs
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

// Prescription Modal DOM Elements
const viewPrescriptionModal = document.getElementById("viewPrescriptionModal");
const closePrescriptionModalBtn = document.getElementById("closePrescriptionModalBtn");
const closePrescriptionModalBtn2 = document.getElementById("closePrescriptionModalBtn2");

const viewPrescDate = document.getElementById("viewPrescDate");
const viewPrescName = document.getElementById("viewPrescName");
const viewPrescAgeSex = document.getElementById("viewPrescAgeSex");
const viewPrescAddress = document.getElementById("viewPrescAddress");
const viewPrescMedsContainer = document.getElementById("viewPrescMedsContainer");
const viewPrescSubscription = document.getElementById("viewPrescSubscription");
const viewPrescSignatura = document.getElementById("viewPrescSignatura");
const viewPrescRenewal = document.getElementById("viewPrescRenewal");
const viewPrescDocAddress = document.getElementById("viewPrescDocAddress");
const viewPrescRegNo = document.getElementById("viewPrescRegNo");
const viewPrescDocSignature = document.getElementById("viewPrescDocSignature");

// Password Form DOM Elements
const changePasswordForm = document.getElementById("changePasswordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
const submitPasswordBtn = document.getElementById("submitPasswordBtn");

// Global Caching
let globalAppointments = [];
let prescriptionsDataMap = {};
let currentUserProfile = null;

// Doctor Name
function formatDoctorName(rawName) {
    if (!rawName) return "Assigned Doctor";
    let cleaned = rawName.trim();
    cleaned = cleaned.replace(/^(dr\.\s*)+/gi, "");
    return `Dr. ${cleaned}`;
}

// TAB SWITCHING LOGIC
window.switchTab = (tabName) => {
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    sidebar?.classList.add("-translate-x-full");
    sidebarOverlay?.classList.add("hidden");

    if (tabName === "security") {
        appointmentsView?.classList.add("hidden");
        securityView?.classList.remove("hidden");

        // active state
        navAppointmentsBtn?.classList.remove("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400",
            "border", "border-cyan-500/20");
        navAppointmentsBtn?.classList.add("text-slate-400");

        navSecurityBtn?.classList.add("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400",
            "border", "border-cyan-500/20");
        navSecurityBtn?.classList.remove("text-slate-400");
    } else {
        securityView?.classList.add("hidden");
        appointmentsView?.classList.remove("hidden");

        navSecurityBtn?.classList.remove("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400",
            "border", "border-cyan-500/20");
        navSecurityBtn?.classList.add("text-slate-400");

        navAppointmentsBtn?.classList.add("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400",
            "border", "border-cyan-500/20");
        navAppointmentsBtn?.classList.remove("text-slate-400");
    }
};

// Auth State Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login/login.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().role !== "patient") {
            alert("Unauthorized access!");
            window.location.href = "../login/login.html";
            return;
        }

        currentUserProfile = userDoc.data();
        currentUserProfile.uid = user.uid;

        if (patientWelcomeName) {
            patientWelcomeName.textContent = currentUserProfile.fullName || currentUserProfile.name || "Patient";
        }

        listenForPatientAppointments(user.uid);
    } catch (err) {
        console.error("Auth check error:", err);
    }
});

// Realtime Appointments Listener
function listenForPatientAppointments(patientId) {
    const q = query(
        collection(db, "appointments"),
        where("patientId", "==", patientId)
    );

    onSnapshot(q, async (snapshot) => {
        if (!appointmentsTable) return;

        if (snapshot.empty) {
            updateStatsCards(0, 0, 0);
            appointmentsTable.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">You haven't booked 
            any appointments yet.</td></tr>`;
            globalAppointments = [];
            return;
        }

        prescriptionsDataMap = {};
        const fetchedApps = [];
        let pendingCount = 0;
        let approvedCount = 0;

        for (const appDoc of snapshot.docs) {
            const data = appDoc.data();
            const appId = appDoc.id;

            const statusLower = (data.status || "pending").toLowerCase();
            if (statusLower === "pending") pendingCount++;
            if (statusLower === "approved") approvedCount++;

            let doctorName = data.doctorName || data.doctor || "";
            if (!doctorName && data.doctorId) {
                try {
                    let dSnap = await getDoc(doc(db, "users", data.doctorId));
                    if (dSnap.exists()) {
                        const dData = dSnap.data();
                        doctorName = dData.fullName || dData.name || dData.email;
                    } else {
                        dSnap = await getDoc(doc(db, "doctor", data.doctorId));
                        if (dSnap.exists()) {
                            doctorName = dSnap.data().fullName || dSnap.data().name;
                        }
                    }
                } catch (e) {
                    console.error("Error fetching doctor name:", e);
                }
            }

            doctorName = formatDoctorName(doctorName);

            let hasPrescription = false;
            try {
                const presq = query(collection(db, "prescriptions"), where("appointmentId", "==", appId));
                const presSnap = await getDocs(presq);

                if (!presSnap.empty) {
                    const presDoc = presSnap.docs[0];
                    prescriptionsDataMap[appId] = { id: presDoc.id, ...presDoc.data() };
                    hasPrescription = true;
                }
            } catch (err) {
                console.error("Error fetching prescription:", appId, err);
            }

            fetchedApps.push({
                id: appId,
                doctorName,
                schedule: `${data.date || 'N/A'} at ${data.time || 'N/A'}`,
                reason: data.reason || '-',
                status: data.status || 'Pending',
                hasPrescription
            });
        }

        globalAppointments = fetchedApps;
        updateStatsCards(pendingCount, approvedCount, fetchedApps.length);
        renderAppointmentsTable();
    });
}

function updateStatsCards(pending, approved, total) {
    if (statPending) statPending.textContent = pending;
    if (statApproved) statApproved.textContent = approved;
    if (statTotal) statTotal.textContent = total;
}

function renderAppointmentsTable() {
    if (!appointmentsTable) return;

    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const filterValue = (statusFilter?.value || "all").toLowerCase();

    const filtered = globalAppointments.filter(app => {
        const matchesSearch = app.doctorName.toLowerCase().includes(searchTerm) ||
            app.reason.toLowerCase().includes(searchTerm);
        const matchesStatus = filterValue === "all" || app.status.toLowerCase() === filterValue;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        appointmentsTable.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">No appointments 
        found matching your filters.</td></tr>`;
        return;
    }

    appointmentsTable.innerHTML = "";
    filtered.forEach(app => {
        const statusLower = app.status.toLowerCase();

        let statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
         bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full
         bg-amber-400"></span> Pending</span>`;
        if (statusLower === "approved") {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
             bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full
             bg-emerald-400"></span> Approved</span>`;
        } else if (statusLower === "rejected") {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
             bg-rose-500/10 text-rose-400 border border-rose-500/20"><span class="w-1.5 h-1.5 rounded-full
             bg-rose-400"></span> Rejected</span>`;
        }

        let actionBtn = `<span class="text-xs text-slate-500">N/A</span>`;
        if (statusLower === "approved") {
            if (app.hasPrescription) {
                actionBtn = `
                    <button onclick="openPrescriptionViewer('${app.id}')" 
                      class="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white 
                      border border-cyan-500/30 text-xs font-bold rounded-xl transition-all inline-flex
                     items-center gap-2 cursor-pointer shadow-sm">
                      <i class="fa-solid fa-file-prescription"></i> Prescription
                    </button>
                `;
            } else {
                actionBtn = `<span class="text-xs text-slate-500 italic">No prescription</span>`;
            }
        }

        const tr = document.createElement("tr");
        tr.className = "border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors";
        tr.innerHTML = `
            <td class="p-4 font-bold text-cyan-400 text-sm">${app.doctorName}</td>
            <td class="p-4 text-xs font-mono text-slate-300">${app.schedule}</td>
            <td class="p-4 text-xs max-w-xs truncate text-slate-400">${app.reason}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-center">${actionBtn}</td>
        `;
        appointmentsTable.appendChild(tr);
    });
}

if (searchInput) searchInput.addEventListener("input", renderAppointmentsTable);
if (statusFilter) statusFilter.addEventListener("change", renderAppointmentsTable);

window.openPrescriptionViewer = async (appId) => {
    const pData = prescriptionsDataMap[appId];
    if (!pData) {
        alert("Prescription details unavailable.");
        return;
    }

    const patientName = pData.patientName || currentUserProfile?.fullName || currentUserProfile?.name || "N/A";
    const age = pData.patientAge || pData.age || currentUserProfile?.age || currentUserProfile?.userAge || "N/A";
    const gender = pData.patientGender || pData.gender || pData.sex || currentUserProfile?.gender || "N/A";
    const address = pData.patientAddress || pData.address || currentUserProfile?.address || currentUserProfile?.location || "N/A";

    if (viewPrescDate) viewPrescDate.textContent = pData.date || "N/A";
    if (viewPrescName) viewPrescName.textContent = patientName;
    if (viewPrescAgeSex) viewPrescAgeSex.textContent = `${age} / ${gender}`;
    if (viewPrescAddress) viewPrescAddress.textContent = address;

    if (viewPrescMedsContainer) {
        viewPrescMedsContainer.innerHTML = "";
        const medsList = pData.medicines || pData.inscription;

        if (Array.isArray(medsList) && medsList.length > 0) {
            medsList.forEach((med, index) => {
                const item = document.createElement("div");
                item.className = "p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs";

                const medName = med.name || med.medName || 'Medicine';
                const dosage = med.dosage ? `(${med.dosage})` : '';
                const freq = med.frequency || med.timing || 'As directed';
                const duration = med.duration || 'Duration N/A';

                item.innerHTML = `
                    <div>
                      <p class="font-bold text-slate-200 text-sm">${index + 1}. ${medName} <span class="text-cyan-400 
                      font-normal text-xs">${dosage}</span></p>

                      <p class="text-slate-400 text-[11px] mt-0.5">Instructions: <span class="font-semibold 
                      text-slate-300">${freq}</span></p>
                    </div>

                    <span class="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold
                     rounded-lg text-[11px]">${duration}</span>
                `;
                viewPrescMedsContainer.appendChild(item);
            });
        } else if (typeof medsList === "string" && medsList.trim() !== "") {
            viewPrescMedsContainer.innerHTML = `<div class="p-3 bg-slate-900/60 border border-slate-800 rounded-xl
             text-xs text-slate-300 font-medium">${medsList}</div>`;
        } else {
            viewPrescMedsContainer.innerHTML = `<p class="text-xs text-slate-400 italic">No medications listed.</p>`;
        }
    }

    if (viewPrescSubscription) viewPrescSubscription.textContent = pData.instructions || pData.subscription || "No pharmacy directives provided.";
    if (viewPrescSignatura) viewPrescSignatura.textContent = pData.diagnosis || pData.signatura || "No specific dosage advice.";
    if (viewPrescRenewal) viewPrescRenewal.textContent = pData.labTests || pData.renewal || "None";

    if (viewPrescDocAddress) viewPrescDocAddress.textContent = pData.doctorAddress ? `Location: ${pData.doctorAddress}` : "Clinic Address: Main Hospital Branch";
    if (viewPrescRegNo) viewPrescRegNo.textContent = pData.registrationNo ? `Reg No: ${pData.registrationNo}` : "Reg No: PMC-REGISTERED";
    if (viewPrescDocSignature) viewPrescDocSignature.textContent = pData.doctorName ? formatDoctorName(pData.doctorName) : "Authorized Medical Doctor";

    viewPrescriptionModal?.classList.remove("hidden");
    viewPrescriptionModal?.classList.add("flex");
};

function closePrescriptionModal() {
    viewPrescriptionModal?.classList.add("hidden");
    viewPrescriptionModal?.classList.remove("flex");
}

if (closePrescriptionModalBtn) closePrescriptionModalBtn.addEventListener("click", closePrescriptionModal);
if (closePrescriptionModalBtn2) closePrescriptionModalBtn2.addEventListener("click", closePrescriptionModal);

// Eye Toggle Logic for Showing / Hiding Password
document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const icon = btn.querySelector("i");

        if (input) {
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }
    });
});

// CHANGE PASSWORD SUBMIT LOGIC
if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const currentPassword = currentPasswordInput?.value.trim();
        const newPassword = newPasswordInput?.value.trim();
        const confirmNewPassword = confirmNewPasswordInput?.value.trim();

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Swal.fire({
                title: "Missing Fields!",
                text: "Please fill in all required password fields.",
                icon: "warning",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#06b6d4"
            });
            return;
        }

        if (newPassword.length < 6) {
            Swal.fire({
                title: "Weak Password!",
                text: "New password must be at least 6 characters long.",
                icon: "warning",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#06b6d4"
            });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Swal.fire({
                title: "Password Mismatch!",
                text: "New Password and Confirm Password do not match.",
                icon: "error",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#06b6d4"
            });
            return;
        }

        const user = auth.currentUser;
        if (!user || !user.email) {
            Swal.fire({
                title: "Authentication Error!",
                text: "No active user session found. Please sign in again.",
                icon: "error",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#f43f5e"
            });
            return;
        }

        if (submitPasswordBtn) {
            submitPasswordBtn.disabled = true;
            submitPasswordBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Updating...`;
        }

        try {
            // 1. Re-authenticate user with Current Password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Update Auth Password
            await updatePassword(user, newPassword);

            // 3. Update Firestore Document (tempPassword field)
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                tempPassword: newPassword
            });

            changePasswordForm.reset();

            await Swal.fire({
                title: "Password Updated!",
                text: "Your password has been changed in Authentication & Firestore successfully.",
                icon: "success",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#06b6d4"
            });

            // Switch view back to appointments
            switchTab('appointments');

        } catch (error) {
            console.error("Password change error:", error);

            let errorMessage = "Failed to update password. Please try again.";

            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                errorMessage = "The current password you entered is incorrect.";
            } else if (error.code === "auth/too-many-requests") {
                errorMessage = "Too many failed attempts. Please try again later.";
            } else if (error.code === "auth/requires-recent-login") {
                errorMessage = "Please log out and log back in before attempting this change.";
            }

            Swal.fire({
                title: "Update Failed!",
                text: errorMessage,
                icon: "error",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#f43f5e"
            });
        } finally {
            if (submitPasswordBtn) {
                submitPasswordBtn.disabled = false;
                submitPasswordBtn.innerHTML = `<i class="fas fa-shield-check"></i> Update Password`;
            }
        }
    });
}

// Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const result = await Swal.fire({
            title: "Sign Out?",
            text: "Are you sure you want to log out of the patient portal?",
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

// Mobile Menu Listeners
document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const closeSidebarBtn = document.getElementById("closeSidebarBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

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
});

// Open / Close & Selection
const dropdownBtn = document.getElementById('dropdownBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const dropdownArrow = document.getElementById('dropdownArrow');
const selectedValue = document.getElementById('selectedValue');
const hiddenInput = document.getElementById('statusFilter');
const items = document.querySelectorAll('.dropdown-item');

dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
    dropdownArrow.classList.toggle('rotate-180');
});

items.forEach(item => {
    item.addEventListener('click', () => {
        selectedValue.textContent = item.textContent.trim();
        hiddenInput.value = item.getAttribute('data-value');
        dropdownMenu.classList.add('hidden');
        dropdownArrow.classList.remove('rotate-180');
        hiddenInput.dispatchEvent(new Event('change'));
    });
});

document.addEventListener('click', () => {
    dropdownMenu.classList.add('hidden');
    dropdownArrow.classList.remove('rotate-180');
});