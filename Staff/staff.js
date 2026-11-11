import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_s10MgIZGnZFhYc45AYmSzMLY1aNlMm8",
    authDomain: "patient-management-e94a1.firebaseapp.com",
    projectId: "patient-management-e94a1",
    storageBucket: "patient-management-e94a1.firebasestorage.app",
    messagingSenderId: "585502487",
    appId: "1:585502487:web:51671a9d4fd3830482f152",
    measurementId: "G-735LKZ6MZ5"
};

// Main Firebase App (Current Logged-In Staff)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Secondary Firebase App (Walk-In Patient)
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

// DOM Elements
const cardTotalPatients = document.getElementById("cardTotalPatients");
const cardTotalDoctors = document.getElementById("cardTotalDoctors");
const cardTotalStaff = document.getElementById("cardTotalStaff");
const patientsTableBody = document.getElementById("patientsTableBody");
const registerPatientForm = document.getElementById("registerPatientForm");
const patientSearchInput = document.getElementById("patientSearchInput");
const logoutBtn = document.getElementById("logoutBtn");

const sectionDashboard = document.getElementById("sectionDashboard");
const sectionWalkIn = document.getElementById("sectionWalkIn");
const navDashboard = document.getElementById("navDashboard");
const navWalkIn = document.getElementById("navWalkIn");

let allPatientsData = [];

// AUTHENTICATION GUARD & LOGGED-IN STAFF DETAILS
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login/login.html";
    } else {

        try {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            const nameElem = document.getElementById("loggedInStaffName");
            const desigElem = document.getElementById("loggedInStaffDesignation");
            const badgeElem = document.getElementById("loggedInStaffBadge");

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                // Set Staff Name
                if (nameElem) {
                    nameElem.innerText = userData.fullName || user.displayName || "Staff Member";
                }

                // Set Designation Description
                if (desigElem && userData.designation) {
                    desigElem.innerText = `${userData.designation} Console | Manage assigned patients and daily operations.`;
                }

                // Set Badge Text
                if (badgeElem && userData.designation) {
                    badgeElem.innerText = `${userData.designation} Workspace`;
                }
            } else {
                if (nameElem) nameElem.innerText = user.displayName || "Staff Member";
            }
        } catch (err) {
            console.error("Error fetching staff details:", err);
        }

        listenToUsers();
    }
});

// Random Password Generator
function generateRandomPassword(length = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Mobile Sidebar Function
function closeMobileSidebarIfOpen() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("mobileBackdrop");
    if (sidebar && backdrop && window.innerWidth < 768) {
        sidebar.classList.add("-translate-x-full");
        backdrop.classList.add("hidden");
    }
}

// SWITCH TABS
window.switchTab = function (tab) {
    const activeClass = "nav-link w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/20 font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer";
    const inactiveClass = "nav-link w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/40 hover:border hover:border-slate-700/50 font-semibold text-sm transition-all duration-200 cursor-pointer";

    if (tab === 'dashboard') {
        sectionDashboard.classList.remove("hidden");
        sectionWalkIn.classList.add("hidden");

        navDashboard.className = activeClass;
        navWalkIn.className = inactiveClass;
    } else if (tab === 'walkin') {
        sectionWalkIn.classList.remove("hidden");
        sectionDashboard.classList.add("hidden");

        navWalkIn.className = activeClass;
        navDashboard.className = inactiveClass;
    }

    closeMobileSidebarIfOpen();
};

// LOGOUT LOGIC
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        Swal.fire({
            title: 'Sign Out?',
            text: "Are you sure you want to log out?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#06b6d4',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Yes, Logout',
            background: '#111625',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                signOut(auth).then(() => {
                    window.location.href = "../login/login.html";
                }).catch((error) => {
                    console.error("Logout Error:", error);
                });
            }
        });
    });
}

// LISTEN TO USERS COLLECTION
function listenToUsers() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        allPatientsData = [];
        let patientCount = 0;
        let doctorCount = 0;
        let staffCount = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const role = (data.role || "").toLowerCase();

            if (role === "patient" || !data.role) {
                patientCount++;
                allPatientsData.push({ id: doc.id, ...data });
            } else if (role === "doctor") {
                doctorCount++;
            } else if (role === "staff") {
                staffCount++;
            }
        });

        // Metrics Counters Update
        if (cardTotalPatients) cardTotalPatients.textContent = patientCount;
        if (cardTotalDoctors) cardTotalDoctors.textContent = doctorCount;
        if (cardTotalStaff) cardTotalStaff.textContent = staffCount;

        // Patients Table Update
        renderPatientsTable(allPatientsData);
    });
}

// RENDER PATIENTS TABLE
function renderPatientsTable(patients) {
    if (!patientsTableBody) return;

    if (patients.length === 0) {
        patientsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-6 text-slate-500">No patients registered in database.</td>
            </tr>
        `;
        return;
    }

    patientsTableBody.innerHTML = "";
    patients.forEach((patient) => {
        const displayName = patient.fullName || patient.name || 'N/A';
        const displayEmail = patient.email || 'N/A';
        const displayPhone = patient.phone || patient.contact || 'N/A';
        const displayGender = patient.gender || 'N/A';
        const displayAge = patient.age ? `${patient.age} yrs` : 'N/A';

        const row = document.createElement("tr");
        row.className = "hover:bg-slate-800/40 transition border-b border-slate-800/40";

        row.innerHTML = `
            <td class="py-4 px-4 font-semibold text-white flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-xs ">
                    ${displayName.charAt(0).toUpperCase()}
                </div>
                ${displayName}
            </td>
            <td class="py-4 px-4 text-slate-300 text-xs">${displayEmail}</td>
            <td class="py-4 px-4 text-slate-300">${displayPhone}</td>
            <td class="py-4 px-4 text-slate-400 text-xs">${displayAge} / ${displayGender}</td>
            <td class="py-4 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium ${patient.type === 'Walk-In' || patient.type === 'walk-in' ? 'bg-cyan-500 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}">
                    ${patient.type || 'Online'}
                </span>
            </td>
        `;
        patientsTableBody.appendChild(row);
    });
}

// Search Filter Input Event
if (patientSearchInput) {
    patientSearchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPatientsData.filter(p => {
            const name = (p.fullName || p.name || "").toLowerCase();
            const phone = (p.phone || "").toLowerCase();
            const email = (p.email || "").toLowerCase();
            return name.includes(term) || phone.includes(term) || email.includes(term);
        });
        renderPatientsTable(filtered);
    });
}

// WALK-IN PATIENT REGISTRATION
if (registerPatientForm) {
    registerPatientForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const phone = document.getElementById("regPhone").value.trim();
        const age = document.getElementById("regAge").value.trim();
        const gender = document.getElementById("regGender").value;

        // Auto password generation
        const generatedPassword = generateRandomPassword(8);

        try {
            Swal.fire({
                title: 'Registering Patient...',
                text: 'Creating credentials and saving data...',
                allowOutsideClick: false,
                background: '#111625',
                color: '#fff',
                didOpen: () => { Swal.showLoading(); }
            });

            // 1. Secondary Auth Patient create
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, generatedPassword);
            const user = userCredential.user;

            // 2. Secondary Auth Sign Out
            await signOut(secondaryAuth);

            // 3. Users collection save record
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                fullName: name,
                email: email,
                phone: phone,
                age: age,
                gender: gender,
                role: "patient",
                type: "Walk-In",
                tempPassword: generatedPassword,
                createdAt: serverTimestamp()
            });

            registerPatientForm.reset();

            // 4. Credentials Notification Output
            Swal.fire({
                icon: 'success',
                title: 'Patient Registered Successfully!',
                html: `
                    <div class="text-left bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 mt-3 text-sm">
                        <p class="text-slate-400"><strong class="text-white">Patient Name:</strong> ${name}</p>
                        <p class="text-slate-400"><strong class="text-white">Email:</strong> ${email}</p>
                        <p class="text-cyan-400"><strong class="text-white">Generated Password:</strong> <span class="font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-cyan-500/10">${generatedPassword}</span></p>
                    </div>
                    <p class="text-xs text-slate-400 mt-4">Account 'users' collection me create ho gaya hai.</p>
                `,
                background: '#111625',
                color: '#fff',
                confirmButtonColor: '#2563eb',
                confirmButtonText: 'Return to Dashboard'
            }).then(() => {
                window.switchTab('dashboard');
            });

        } catch (error) {
            console.error("Error registering patient: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: error.message,
                background: '#111625',
                color: '#fff'
            });
        }
    });
}


// MOBILE NAVIGATION CONTROL SCRIPT
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const mobileBackdrop = document.getElementById('mobileBackdrop');

function closeMobileSidebar() {
    sidebar.classList.add('-translate-x-full');
    mobileBackdrop.classList.add('hidden');
}

function toggleMobileMenu() {
    sidebar.classList.toggle('-translate-x-full');
    mobileBackdrop.classList.toggle('hidden');
}

mobileMenuBtn.addEventListener('click', toggleMobileMenu);
closeSidebarBtn.addEventListener('click', closeMobileSidebar);
mobileBackdrop.addEventListener('click', closeMobileSidebar);

// Sidebar navigation links auto-close
document.querySelectorAll('.nav-link').forEach(button => {
    button.addEventListener('click', () => {
        if (window.innerWidth < 768) {
            closeMobileSidebar();
        }
    });
});

// Gender Dropdown
const regGenderBtn = document.getElementById('regGenderBtn');
const regGenderMenu = document.getElementById('regGenderMenu');
const regGenderArrow = document.getElementById('regGenderArrow');
const regGenderSelected = document.getElementById('regGenderSelected');
const regGenderInput = document.getElementById('regGender');
const regGenderOptions = document.querySelectorAll('.reg-gender-option');

if (regGenderBtn) {
  regGenderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    regGenderMenu.classList.toggle('hidden');
    regGenderArrow.classList.toggle('rotate-180');
  });
}

regGenderOptions.forEach(option => {
  option.addEventListener('click', () => {
    regGenderSelected.textContent = option.textContent.trim();
    if (regGenderInput) {
      regGenderInput.value = option.getAttribute('data-value');
    }
    regGenderMenu.classList.add('hidden');
    regGenderArrow.classList.remove('rotate-180');
  });
});

document.addEventListener('click', () => {
  if (regGenderMenu) {
    regGenderMenu.classList.add('hidden');
    regGenderArrow.classList.remove('rotate-180');
  }
});