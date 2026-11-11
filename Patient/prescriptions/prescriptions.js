import {
    auth,
    db,
    signOut,
    onAuthStateChanged,
    collection,
    query,
    where,
    onSnapshot,
    getDocs,
    doc,
    updateDoc
} from "../../firebase.js";

import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const prescriptionsContainer = document.getElementById("prescriptionsContainer");
const prescriptionsView = document.getElementById("prescriptionsView");
const securityView = document.getElementById("securityView");
const navPrescriptionsBtn = document.getElementById("navPrescriptionsBtn");
const navSecurityBtn = document.getElementById("navSecurityBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Mobile Navigation Elements
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebar = document.getElementById("sidebar");

// AUTH LISTENER
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "./login/login.html";
        return;
    }

    console.log("Current Logged-in Patient UID:", user.uid);
    fetchPrescriptions(user.uid);
});

// MOBILE MENU CONTROLS
const toggleSidebar = (show) => {
    if (show) {
        sidebar?.classList.remove("-translate-x-full");
        sidebarOverlay?.classList.remove("hidden");
    } else {
        sidebar?.classList.add("-translate-x-full");
        sidebarOverlay?.classList.add("hidden");
    }
};

mobileMenuBtn?.addEventListener("click", () => toggleSidebar(true));
closeSidebarBtn?.addEventListener("click", () => toggleSidebar(false));
sidebarOverlay?.addEventListener("click", () => toggleSidebar(false));

// TAB SWITCHING LOGIC
window.switchTab = (tabName) => {
    toggleSidebar(false);

    if (tabName === "security") {
        prescriptionsView?.classList.add("hidden");
        securityView?.classList.remove("hidden");

        navPrescriptionsBtn?.classList.remove("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400", "border", "border-cyan-500/20");
        navPrescriptionsBtn?.classList.add("text-slate-400");

        navSecurityBtn?.classList.add("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400", "border", "border-cyan-500/20");
        navSecurityBtn?.classList.remove("text-slate-400");
    } else {
        securityView?.classList.add("hidden");
        prescriptionsView?.classList.remove("hidden");

        navSecurityBtn?.classList.remove("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400", "border", "border-cyan-500/20");
        navSecurityBtn?.classList.add("text-slate-400");

        navPrescriptionsBtn?.classList.add("bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "text-cyan-400", "border", "border-cyan-500/20");
        navPrescriptionsBtn?.classList.remove("text-slate-400");
    }
};

// SHOW / HIDE PASSWORD EYE TOGGLE
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

// PASSWORD UPDATE SUBMIT HANDLER
const changePasswordForm = document.getElementById("changePasswordForm");
if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById("currentPassword")?.value.trim();
        const newPassword = document.getElementById("newPassword")?.value.trim();
        const confirmNewPassword = document.getElementById("confirmNewPassword")?.value.trim();
        const submitPasswordBtn = document.getElementById("submitPasswordBtn");

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
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update Auth Password
            await updatePassword(user, newPassword);

            // Update Firestore Database field
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                tempPassword: newPassword
            });

            changePasswordForm.reset();

            await Swal.fire({
                title: "Password Updated!",
                text: "Your password has been changed successfully.",
                icon: "success",
                background: "#0f172a",
                color: "#f8fafc",
                confirmButtonColor: "#06b6d4"
            });

            switchTab('prescriptions');

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

// LOGOUT HANDLER
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

// FETCH PRESCRIPTIONS LOGIC
async function fetchPrescriptions(patientId) {
    try {
        const prescriptionsRef = collection(db, "prescriptions");
        const q = query(prescriptionsRef, where("patientId", "==", patientId));

        // Realtime Listener
        onSnapshot(q, (snapshot) => {
            console.log("Prescriptions Snapshot Size:", snapshot.size);

            if (snapshot.empty) {
                renderEmptyState("No prescription has been added yet.");
                return;
            }

            renderPrescriptions(snapshot);
        }, (error) => {
            console.error("Firestore Query Error:", error);

            // Direct getDocs Call Fallback
            getDocs(prescriptionsRef).then((allDocs) => {
                const userPrescriptions = [];
                allDocs.forEach(docSnap => {
                    if (docSnap.data().patientId === patientId) {
                        userPrescriptions.push({ id: docSnap.id, ...docSnap.data() });
                    }
                });

                if (userPrescriptions.length === 0) {
                    renderEmptyState("Koi prescription nahi mili.");
                } else {
                    renderManualList(userPrescriptions);
                }
            }).catch(e => {
                console.error("Fallback Error:", e);
                renderEmptyState("Database connection error! Check browser console.");
            });
        });

    } catch (err) {
        console.error("General Error:", err);
        renderEmptyState("Data load hone mein masla hua hai.");
    }
}

function renderEmptyState(message) {
    if (!prescriptionsContainer) return;
    prescriptionsContainer.innerHTML = `
        <div class="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl">
                <i class="fa-solid fa-pills"></i>
            </div>
            <p class="text-sm font-bold text-slate-300">${message}</p>
            <p class="text-xs text-slate-500">After your appointment is completed, the doctor will add the prescription here.</p>
        </div>
    `;
}

function renderPrescriptions(snapshot) {
    prescriptionsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        createPrescriptionCard(data);
    });
}

function renderManualList(list) {
    prescriptionsContainer.innerHTML = "";
    list.forEach(data => createPrescriptionCard(data));
}

function createPrescriptionCard(data) {
    const card = document.createElement("div");
    card.className = "p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 backdrop-blur-xl hover:border-slate-700 transition-all";

    let medicinesListHTML = "";
    if (data.medicines && Array.isArray(data.medicines)) {
        data.medicines.forEach((med) => {
            medicinesListHTML += `
                <div class="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2">
                    <div>
                        <p class="text-xs font-bold text-cyan-400"><i class="fa-solid fa-capsules mr-1.5 text-slate-500"></i> ${med.name || 'Medicine'}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Dosage: <span class="text-slate-200 font-semibold">${med.dosage || '1-0-1'}</span> (${med.timing || 'After Meals'})</p>
                    </div>
                    <span class="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-bold">
                        ${med.days || '5'} Days
                    </span>
                </div>
            `;
        });
    }

    card.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <i class="fa-solid fa-user-md"></i>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-100">${data.doctorName || 'Doctor Consultation'}</h4>
                    <p class="text-[11px] text-slate-500">${data.date || 'Recent Visit'}</p>
                </div>
            </div>
            <button onclick="window.print()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-print"></i> Print
            </button>
        </div>

        <div class="space-y-2">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prescribed Medicines</p>
            <div class="space-y-2">
                ${medicinesListHTML || '<p class="text-xs text-slate-500">No specific medicines listed.</p>'}
            </div>
        </div>

        ${data.instructions ? `
            <div class="p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl text-xs text-slate-400">
                <span class="font-bold text-slate-300">Doctor Advice:</span> ${data.instructions}
            </div>
        ` : ''}
    `;

    prescriptionsContainer.appendChild(card);
}