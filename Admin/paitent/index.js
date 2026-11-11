import {
  db,
  auth,
  secondaryAuth, 
  signOut,
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  setDoc, 
  serverTimestamp,
  addDoc,
  createUserWithEmailAndPassword,
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

// ===== STATE MANAGERS =====
let adminDocCount = 0;
let usersDocCount = 0;
let usersStaffCount = 0;

let adminPatients = [];
let userPatients = [];
let patientsMap = new Map();

// ===== UPDATE DOCTOR COUNTER =====
const updateDoctorCount = () => {
  if (doctorCount) {
    const totalDoctors = usersDocCount + adminDocCount;
    doctorCount.innerText = totalDoctors;
    localStorage.setItem("lastDoctorCount", totalDoctors);
  }
};

// DOCTORS COLLECTION LISTENER
onSnapshot(collection(db, "doctor"), (snapshot) => {
  adminDocCount = snapshot.size;
  updateDoctorCount();
});

// USERS COLLECTION LISTENER (Doctors, Patients & Staff)
onSnapshot(collection(db, "users"), (snapshot) => {
  let tempDocCount = 0;
  let tempStaffCount = 0;
  userPatients = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const role = data.role;

    if (role === "doctor") {
      tempDocCount++;
    }

    if (role === "staff") {
      tempStaffCount++;
    }

    if (role === "patient") {
      userPatients.push({
        id: docSnap.id,
        collectionName: "users",
        ...data
      });
    }
  });

  usersDocCount = tempDocCount;
  usersStaffCount = tempStaffCount;

  updateDoctorCount();

  if (staffCount) {
    staffCount.innerText = usersStaffCount;
  }

  syncAndRenderPatients();
});

// ===== REALTIME STATS LISTENERS =====
onSnapshot(collection(db, "appointments"), (snapshot) => {
  if (appointmentCount) appointmentCount.innerText = snapshot.size;
});

onSnapshot(collection(db, "departments"), (snapshot) => {
  if (departmentCount) departmentCount.innerText = snapshot.size;
});

onSnapshot(collection(db, "contacts"), (snapshot) => {
  if (messageCount) messageCount.textContent = snapshot.size;
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

// ===== DOM ELEMENTS FOR PATIENTS =====
const modal = document.getElementById("addPatientModal");
const addBtn = document.getElementById("addPatientBtn");
const cancelModal = document.getElementById("cancelModal");
const closeModalCross = document.getElementById("closeModalCross");
const patientTableBody = document.getElementById("patientTableBody");
const searchInput = document.getElementById("searchInput");
const form = document.getElementById("addPatientForm");
const modalTitle = modal?.querySelector("h2");

// EDIT STATE TRACKERS
let editPatientId = null;
let editPatientCollection = "patient";

// ===== GENDER DROPDOWN =====
const genderBtn = document.getElementById('customGenderBtn');
const genderMenu = document.getElementById('customGenderMenu');
const genderInput = document.getElementById('pGender');
const genderText = document.getElementById('selectedGenderText');

if (genderBtn && genderMenu) {
  genderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    genderMenu.classList.toggle('hidden');
  });

  document.querySelectorAll('.gender-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const val = e.target.getAttribute('data-value');
      if (genderInput) genderInput.value = val;
      if (genderText) {
        genderText.innerText = val;
        genderText.classList.remove('text-slate-400');
        genderText.classList.add('text-white');
      }
      genderMenu.classList.add('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    if (!genderBtn.contains(e.target) && !genderMenu.contains(e.target)) {
      genderMenu.classList.add('hidden');
    }
  });
}

// ===== RESET GENDER UI =====
const resetGenderUI = () => {
  if (genderInput) genderInput.value = "";
  if (genderText) {
    genderText.innerText = "Select Gender";
    genderText.classList.remove("text-white");
    genderText.classList.add("text-slate-400");
  }
};

// ===== OPEN MODAL (ADD MODE) =====
addBtn?.addEventListener("click", () => {
  form?.reset();
  resetGenderUI();
  editPatientId = null;
  editPatientCollection = "patient";
  if (modalTitle) modalTitle.innerText = "Add New Patient";
  modal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
});

// ===== CLOSE MODAL =====
const closeModal = () => {
  modal?.classList.add("hidden");
  form?.reset();
  resetGenderUI();
  editPatientId = null;
  editPatientCollection = "patient";
  document.body.classList.remove("overflow-hidden");
};

cancelModal?.addEventListener("click", closeModal);
closeModalCross?.addEventListener("click", closeModal);

modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ===== ADD / UPDATE PATIENT SUBMISSION =====
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("pName")?.value.trim() || "";
  const age = document.getElementById("pAge")?.value.trim() || "";
  const gender = document.getElementById("pGender")?.value || "";
  const phone = document.getElementById("pPhone")?.value.trim() || "";
  const email = document.getElementById("pEmail")?.value.trim() || "";
  const password = document.getElementById("pPassword")?.value || "";

  // FORM VALIDATION
  if (!fullName) {
    return Swal.fire({ title: "Full Name Required", text: "Please enter patient's full name.", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  if (!email) {
    return Swal.fire({ title: "Email Required", text: "Please enter patient's email address.", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return Swal.fire({ title: "Invalid Email", text: "Please enter a valid email address.", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  if (!editPatientId && (!password || password.length < 6)) {
    return Swal.fire({ title: "Password Required", text: "Please enter a secure password (minimum 6 characters).", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  if (!age) {
    return Swal.fire({ title: "Age Required", text: "Please enter patient's age.", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  if (!gender || gender === "Select Gender") {
    return Swal.fire({ title: "Gender Required", text: "Please select a valid gender.", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  if (!phone) {
    return Swal.fire({ title: "Phone Required", text: "Please enter phone number.", icon: "warning", background: "#0f172a", color: "#f8fafc", confirmButtonColor: "#06b6d4" });
  }

  try {
    if (editPatientId) {
      const patientUpdateData = {
        fullName,
        age: Number(age),
        gender,
        phone,
        email,
        role: "patient"
      };

      await updateDoc(doc(db, editPatientCollection, editPatientId), patientUpdateData);
      
      Swal.fire({
        title: "Patient Updated!",
        text: "Patient profile updated successfully.",
        icon: "success",
        background: "#0f172a",
        color: "#f8fafc",
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      // 1. Create Auth user via secondaryAuth so Admin stays logged in
      console.log("Creating auth user in secondary app...");
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const patientUid = userCredential.user.uid;
      console.log("Auth user created with UID:", patientUid);

      const patientData = {
        uid: patientUid,
        fullName,
        age: Number(age),
        gender,
        phone,
        email,
        role: "patient",
        createdAt: serverTimestamp()
      };

      // 2. Save explicitly to Firestore users collection using UID as document ID
      console.log("Saving document to Firestore users collection...");
      await setDoc(doc(db, "users", patientUid), patientData);
      console.log("Firestore document successfully written!");

      Swal.fire({
        title: "Patient Added!",
        text: "New patient record registered and auth account created successfully.",
        icon: "success",
        background: "#0f172a",
        color: "#f8fafc",
        timer: 2000,
        showConfirmButton: false
      });
    }

    closeModal();
  } catch (error) {
    console.error("Firestore/Auth Detailed Error:", error);
    Swal.fire({
      title: "System Error!",
      text: error.message || "Failed to save patient record. Try again.",
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e"
    });
  }
});

// ===== COMBINED PATIENTS SYNC & LISTENERS =====
const syncAndRenderPatients = () => {
  patientsMap.clear();

  const allPatients = [...adminPatients, ...userPatients];

  allPatients.forEach((item) => {
    patientsMap.set(item.id, item);
  });

  const totalPatientCount = patientsMap.size;
  if (patientCount) {
    patientCount.innerText = totalPatientCount;
  }
  localStorage.setItem("lastPatientCount", totalPatientCount);

  renderPatients(Array.from(patientsMap.values()));
};

// Admin Created patient Collection
onSnapshot(collection(db, "patient"), (snapshot) => {
  adminPatients = [];
  snapshot.forEach((docSnap) => {
    adminPatients.push({
      id: docSnap.id,
      collectionName: "patient",
      ...docSnap.data()
    });
  });
  syncAndRenderPatients();
});

// ===== RENDER PATIENTS TABLE =====
function renderPatients(patientsList) {
  if (!patientTableBody) return;

  patientTableBody.innerHTML = "";
  let count = 0;
  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";

  patientsList.forEach((patient) => {
    const nameMatch = patient.fullName?.toLowerCase().includes(searchValue);
    const emailMatch = patient.email?.toLowerCase().includes(searchValue);
    const phoneMatch = patient.phone?.toLowerCase().includes(searchValue);

    if (searchValue && !nameMatch && !emailMatch && !phoneMatch) {
      return;
    }

    count++;
    const initial = patient.fullName ? patient.fullName.charAt(0).toUpperCase() : "P";

    patientTableBody.innerHTML += `
      <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 group">
        <td class="py-4 px-6 text-center text-slate-500 font-mono text-xs font-semibold">#0${count}</td>
        
        <td class="py-4 px-6 font-semibold text-white">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border 
            border-cyan-500/30 text-cyan-400 flex items-center 
            justify-center text-xs font-black shrink-0 group-hover:scale-105 transition-transform">
              ${initial}
            </div>
            <span class="text-xs text-slate-100">${patient.fullName || "N/A"}</span>
          </div>
        </td>

        <td class="py-4 px-6 text-slate-300 font-medium text-xs">${patient.age ? patient.age + " yrs" : "N/A"}</td>
        
        <td class="py-4 px-6">
          <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/50">
            ${patient.gender || "N/A"}
          </span>
        </td>

        <td class="py-4 px-6 text-slate-300 font-mono text-xs">${patient.phone || "-"}</td>
        <td class="py-4 px-6 text-slate-400 text-xs">${patient.email || "-"}</td>

        <td class="py-4 px-6 text-center">
          <div class="flex items-center justify-center gap-2">
            <button
              title="Edit Patient"
              onclick="editPatient('${patient.id}')"
              class="w-8 h-8 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/20 flex items-center justify-center transition-all cursor-pointer">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button
              title="Delete Patient"
              onclick="deletePatient('${patient.id}')"
              class="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 flex items-center justify-center transition-all cursor-pointer">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  if (count === 0) {
    patientTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-slate-500 font-medium">
          <div class="flex flex-col items-center justify-center gap-2">
            <i class="fas fa-folder-open text-3xl text-slate-600 mb-1"></i>
            <span>No Patient Records Found</span>
          </div>
        </td>
      </tr>
    `;
  }
}

// SEARCH INPUT LISTENER
searchInput?.addEventListener("input", () => {
  syncAndRenderPatients();
});

// ===== DELETE PATIENT ACTION =====
window.deletePatient = async (id) => {
  const patient = patientsMap.get(id);
  if (!patient) return;

  const result = await Swal.fire({
    title: "Delete Patient?",
    text: "Are you sure you want to delete this patient permanently?",
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
    await deleteDoc(doc(db, patient.collectionName || "patient", id));

    Swal.fire({
      title: "Deleted!",
      text: "Patient profile removed successfully.",
      icon: "success",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#06b6d4",
      timer: 1800,
      showConfirmButton: false
    });
  } catch (error) {
    console.error("Delete error:", error);
    Swal.fire({
      title: "Delete Failed!",
      text: "Unable to delete patient record.",
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e"
    });
  }
};

// ===== EDIT PATIENT ACTION =====
window.editPatient = (id) => {
  const patient = patientsMap.get(id);
  if (!patient) return;

  editPatientId = id;
  editPatientCollection = patient.collectionName || "patient";

  if (modalTitle) modalTitle.innerText = "Edit Patient Details";

  const nameInput = document.getElementById("pName");
  const ageInput = document.getElementById("pAge");
  const genderInput = document.getElementById("pGender");
  const phoneInput = document.getElementById("pPhone");
  const emailInput = document.getElementById("pEmail");

  if (nameInput) nameInput.value = patient.fullName || "";
  if (ageInput) ageInput.value = patient.age || "";
  if (phoneInput) phoneInput.value = patient.phone || "";
  if (emailInput) emailInput.value = patient.email || "";

  // Set Hidden Gender Value 
  if (genderInput) genderInput.value = patient.gender || "";
  if (genderText) {
    genderText.innerText = patient.gender || "Select Gender";
    if (patient.gender) {
      genderText.classList.remove("text-slate-400");
      genderText.classList.add("text-white");
    } else {
      genderText.classList.remove("text-white");
      genderText.classList.add("text-slate-400");
    }
  }

  modal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
};

// ===== SWEETALERT UTILITY HELPERS =====
function showWarningAlert(title, text) {
  return Swal.fire({
    icon: "warning",
    title: title,
    text: text,
    background: "#0f172a",
    color: "#f8fafc",
    confirmButtonColor: "#06b6d4"
  });
}

function showSuccessAlert(title, text) {
  return Swal.fire({
    title: title,
    text: text,
    icon: "success",
    background: "#0f172a",
    color: "#f8fafc",
    confirmButtonColor: "#06b6d4",
    timer: 2000,
    showConfirmButton: false
  });
}