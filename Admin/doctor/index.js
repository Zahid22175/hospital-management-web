import {
  db,
  auth,
  secondaryAuth,
  signOut,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
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

let masterDoctorsList = new Map();
let userPatientsCount = 0;
let adminPatientsCount = 0;

// Combined Doctor Counter 
const updateCombinedDoctorCount = () => {
  if (doctorCount) {
    const totalDoctors = masterDoctorsList.size;
    doctorCount.innerText = totalDoctors;
    localStorage.setItem("lastDoctorCount", totalDoctors);
  }
};

// Combined Patient Counter 
const updateCombinedPatientCount = () => {
  if (patientCount) {
    const totalPatients = userPatientsCount + adminPatientsCount;
    patientCount.innerText = totalPatients;
    localStorage.setItem("lastPatientCount", totalPatients);
  }
};

// ===== REALTIME STATS LISTENERS =====

// 1. PATIENTS
onSnapshot(collection(db, "patient"), (snapshot) => {
  adminPatientsCount = snapshot.size;
  if (typeof updateCombinedPatientCount === "function") {
    updateCombinedPatientCount();
  } else if (patientCount) {
    patientCount.textContent = snapshot.size;
  }
});

// 2. APPOINTMENTS
onSnapshot(collection(db, "appointments"), (snapshot) => {
  if (appointmentCount) appointmentCount.innerText = snapshot.size;
});

// 3. DEPARTMENTS
onSnapshot(collection(db, "departments"), (snapshot) => {
  if (departmentCount) departmentCount.innerText = snapshot.size;
});

// 4. STAFF
onSnapshot(collection(db, "users"), (snapshot) => {
  let count = 0;
  snapshot.forEach((docSnap) => {
    if (docSnap.data().role === "staff") count++;
  });
  if (staffCount) staffCount.textContent = count;
});

// 5. MESSAGES
onSnapshot(collection(db, "contacts"), (snapshot) => {
  if (messageCount) messageCount.textContent = snapshot.size;
});

// ===== LOGOUT SYSTEM =====
const logoutBtn = document.getElementById("logoutBtn") || document.querySelector(".logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const result = await Swal.fire({
      title: "Sign Out?",
      text: "Are you sure you want to log out?",
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

// ===== ADD / EDIT DOCTOR MODAL ELEMENTS =====
const modal = document.getElementById("addDoctorModal");
const modalContent = modal?.querySelector(".bg-slate-900") || modal?.querySelector(".bg-white");
const addBtn = document.getElementById("addDoctorBtn");
const cancelModal = document.getElementById("cancelModal");
const closeModalCross = document.getElementById("closeModalCross");
const doctorTableBody = document.getElementById("doctorTableBody");
const searchInput = document.getElementById("searchInput");
const form = document.getElementById("addDoctorForm");

// ===== DOCTOR VIEW POPUP MODAL ELEMENTS =====
const doctorViewModal = document.getElementById("doctorViewModal");
const closeDoctorViewModal = document.getElementById("closeDoctorViewModal");

closeDoctorViewModal?.addEventListener("click", () => {
  doctorViewModal?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
});

// ===== EDIT MODE TRACKERS =====
let editDoctorId = null;
let editSourceCollection = "doctor";

// ===== OPEN ADD DOCTOR MODAL =====
addBtn?.addEventListener("click", () => {
  form?.reset();
  editDoctorId = null;
  editSourceCollection = "doctor";

  if (selectedSpecialty) {
    selectedSpecialty.textContent = "Select Specialty Domain";
    selectedSpecialty.classList.add("text-slate-500");
  }

  modal?.classList.remove("hidden");
  if (modalContent) modalContent.scrollTop = 0;
  document.body.classList.add("overflow-hidden");
});

// ===== CLOSE ADD DOCTOR MODAL =====
const closeModal = () => {
  modal?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
};

cancelModal?.addEventListener("click", closeModal);
closeModalCross?.addEventListener("click", closeModal);

modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

doctorViewModal?.addEventListener("click", (e) => {
  if (e.target === doctorViewModal) {
    doctorViewModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
});

// ===== ADD & UPDATE DOCTOR SUBMISSION =====
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const selectedDays = [];
  document.querySelectorAll(".day").forEach((day) => {
    if (day.checked) selectedDays.push(day.value);
  });

  const startTime = document.getElementById("startTime")?.value || "";
  const endTime = document.getElementById("endTime")?.value || "";
  const password = document.getElementById("dPassword")?.value || "";
  const email = document.getElementById("dEmail")?.value || "";
  const fullName = document.getElementById("dName")?.value || "";
  const phone = document.getElementById("dPhone")?.value || "";
  const specialty = document.getElementById("dSpecialty")?.value || "General";

  let formattedSlot = "Not Specified";
  if (selectedDays.length > 0) {
    const daysText = selectedDays.join(", ");
    const timeText = (startTime && endTime) ? `${startTime} - ${endTime}` : "Flexible";
    formattedSlot = `${daysText} | ${timeText}`;
  }

  try {
    if (editDoctorId) {
      // Edit mode
      const doctorUpdateData = {
        fullName,
        email,
        phone,
        specialty,
        qualification: document.getElementById("dQualification")?.value || "Medical Specialist",
        experience: document.getElementById("dExperience")?.value || "1",
        imageUrl: document.getElementById("dImageUrl")?.value || "",
        about: document.getElementById("dAbout")?.value || "",
        availableDays: selectedDays,
        startTime,
        endTime,
        slot: formattedSlot,
        role: "doctor"
      };

      await updateDoc(doc(db, editSourceCollection, editDoctorId), doctorUpdateData);

      Swal.fire({
        title: "Doctor Profile Updated!",
        text: "Changes saved to medical database.",
        icon: "success",
        confirmButtonColor: "#06b6d4",
        background: "#0f172a",
        color: "#f8fafc",
        timer: 2000,
        showConfirmButton: false
      });

      editDoctorId = null;
    } else {
  
      // Create Auth User using secondaryAuth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const doctorUid = userCredential.user.uid;

      // Doctor Data 
      const doctorData = {
        uid: doctorUid,
        fullName,
        email,
        phone,
        specialty,
        qualification: "Medical Specialist",
        experience: "1",
        imageUrl: "",
        about: "Registered Specialist Practitioner.",
        availableDays: selectedDays,
        startTime,
        endTime,
        slot: formattedSlot,
        role: "doctor",
        createdAt: serverTimestamp()
      };

      // Save to Firestore using setDoc with doctorUid 
      await setDoc(doc(db, "users", doctorUid), doctorData);

      Swal.fire({
        title: "Doctor Registered!",
        text: "New specialist added and auth account created successfully.",
        icon: "success",
        confirmButtonColor: "#06b6d4",
        background: "#0f172a",
        color: "#f8fafc",
        timer: 2000,
        showConfirmButton: false
      });
    }

    form.reset();
    closeModal();
  } catch (error) {
    console.error("Firestore/Auth Error:", error);
    Swal.fire({
      title: "System Error!",
      text: error.message || "Failed to register doctor. Try again.",
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e"
    });
  }
});

// ===== REALTIME COMBINED DOCTORS & USERS LISTENERS =====
function listenToAllDoctorsAndUsers() {
  masterDoctorsList.clear();

  onSnapshot(collection(db, "doctor"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "removed") {
        masterDoctorsList.delete(change.doc.id);
      } else {
        masterDoctorsList.set(change.doc.id, {
          id: change.doc.id,
          ...change.doc.data(),
          sourceCollection: "doctor"
        });
      }
    });
    updateCombinedDoctorCount();
    renderDoctors();
  });

  onSnapshot(collection(db, "users"), (snapshot) => {
    let patientCountAcc = 0;

    snapshot.docChanges().forEach((change) => {
      const uData = change.doc.data();

      if (uData?.role === "doctor") {
        if (change.type === "removed") {
          masterDoctorsList.delete(change.doc.id);
        } else {
          let userSlot = "Not Set";
          if (uData.slot) {
            userSlot = uData.slot;
          } else if (uData.availableDays && uData.availableDays.length > 0) {
            const days = uData.availableDays.join(", ");
            const times = (uData.startTime && uData.endTime) ? `${uData.startTime} - ${uData.endTime}` : "";
            userSlot = times ? `${days} | ${times}` : days;
          }

          let rawName = uData.fullName || (uData.email ? uData.email.split('@')[0] : 'Specialist');
          let formattedName = rawName.toLowerCase().startsWith("dr.") ? rawName : `Dr. ${rawName}`;
          let userPhone = uData.phone || uData.phoneNumber || uData.mobile || uData.contact || "";

          masterDoctorsList.set(change.doc.id, {
            id: change.doc.id,
            fullName: formattedName,
            email: uData.email || "",
            phone: userPhone,
            specialty: uData.specialty || "General",
            qualification: uData.qualification || uData.specialty || "Medical Specialist",
            experience: uData.experience || "1",
            availableDays: uData.availableDays || [],
            startTime: uData.startTime || "",
            endTime: uData.endTime || "",
            slot: userSlot,
            about: uData.about || "Registered Specialist Practitioner.",
            imageUrl: uData.imageUrl || "",
            sourceCollection: "users"
          });
        }
      }
    });

    snapshot.forEach((docSnap) => {
      if (docSnap.data().role === "patient") {
        patientCountAcc++;
      }
    });

    userPatientsCount = patientCountAcc;
    updateCombinedPatientCount();
    updateCombinedDoctorCount();
    renderDoctors();
  });
}

listenToAllDoctorsAndUsers();

const specialtyFilter = document.getElementById("specialtyFilter");
specialtyFilter?.addEventListener("change", () => {
  renderDoctors();
});

// ===== RENDER DOCTORS TABLE =====
function renderDoctors() {
  if (!doctorTableBody) return;

  doctorTableBody.innerHTML = "";
  let count = 0;

  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCategory = specialtyFilter ? specialtyFilter.value.toLowerCase().trim() : "";

  masterDoctorsList.forEach((doctor) => {
    const docId = doctor.id;
    const docName = doctor.fullName || '';
    const docEmail = doctor.email || '';
    const docPhone = doctor.phone || 'N/A';
    const docSpecialty = doctor.specialty || 'General';

    const matchesSearch = docName.toLowerCase().includes(searchValue) ||
      docEmail.toLowerCase().includes(searchValue) ||
      docSpecialty.toLowerCase().includes(searchValue);

    const docSpecLower = docSpecialty.toLowerCase().trim();
    const matchesCategory = selectedCategory === "" ||
      docSpecLower === selectedCategory ||
      docSpecLower.includes(selectedCategory) ||
      selectedCategory.includes(docSpecLower);

    if (!matchesSearch || !matchesCategory) return;

    count++;

    const firstLetter = docName.replace(/^Dr\.\s*/i, "").trim().charAt(0) || "D";

    doctorTableBody.innerHTML += `
      <tr class="hover:bg-slate-800/40 border-b border-slate-800/40 transition-all duration-200 group">
        <td class="py-4 px-4 text-center font-bold text-slate-500 text-xs">#0${count}</td>
        <td class="py-4 px-6">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              ${doctor.imageUrl ? `<img src="${doctor.imageUrl}" alt="${docName}" class="w-full h-full object-cover">` : firstLetter}
            </div>
            <div>
              <button type="button" onclick='openDoctorViewModal(${JSON.stringify(doctor)})' class="font-bold text-slate-100 text-xs hover:text-cyan-300 transition-colors text-left focus:outline-none cursor-pointer hover:underline block">
                ${docName}
              </button>
              <div class="text-[10px] text-slate-400 font-medium">${docSpecialty}</div>
            </div>
          </div>
        </td>
        <td class="py-4 px-6 text-slate-300 text-xs">
          <div class="flex flex-col gap-1 items-start">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
              <i class="fa-regular fa-envelope text-slate-500"></i> ${docEmail}
            </span>
            <div class="inline-flex items-center gap-1.5 pl-1 text-[11px] text-slate-400 font-medium">
              <i class="fa-solid fa-phone text-[9px] text-slate-500"></i>
              <span>${docPhone}</span>
            </div>
          </div>
        </td>
        <td class="py-4 px-6">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
          ${docSpecialty}
        </span>
      </td>
      
        <td class="py-4 px-6">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-[11px] font-medium text-emerald-400">Available</span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              <i class="fa-regular fa-clock text-slate-500 mr-1"></i>${doctor.slot || 'Mon - Sat | 09:00 - 17:00'}
            </div>
          </div>
        </td>
        <td class="py-4 px-6 text-center">
          <div class="flex items-center justify-center gap-2">
            <button title="Edit Doctors" onclick='editDoctor("${docId}", ${JSON.stringify(doctor)})' class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-all flex items-center justify-center cursor-pointer">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button title="Delete Profile" onclick='deleteDoctor("${docId}", "${doctor.sourceCollection}")' class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center cursor-pointer">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>`;
  });

  const showingCount = document.getElementById("showingCount");
  if (showingCount) showingCount.innerText = `Showing ${count} Registered Doctors`;

  if (count === 0) {
    doctorTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-12 text-slate-500">
          <i class="fas fa-user-slash text-3xl mb-2 block text-slate-600"></i>
          No Doctor Profiles Found
        </td>
      </tr>`;
  }
}

searchInput?.addEventListener("input", () => {
  renderDoctors();
});

window.openDoctorViewModal = (doctor) => {
  if (!doctor) return;
  const docName = doctor.fullName ? (doctor.fullName.startsWith("Dr.") ? doctor.fullName : `Dr. ${doctor.fullName}`) : "Doctor Profile";
  const specialty = doctor.specialty || "General Medicine";

  const imgElem = document.getElementById("viewDocImage");
  const fallbackIcon = document.getElementById("viewDocAvatarFallback");

  if (doctor.imageUrl) {
    if (imgElem) {
      imgElem.src = doctor.imageUrl;
      imgElem.classList.remove("hidden");
    }
    fallbackIcon?.classList.add("hidden");
  } else {
    imgElem?.classList.add("hidden");
    fallbackIcon?.classList.remove("hidden");
  }

  const nameElem = document.getElementById("viewDocName");
  if (nameElem) nameElem.innerText = docName;

  const badgeElem = document.getElementById("viewDocSpecialtyBadge");
  if (badgeElem) badgeElem.innerText = specialty.toUpperCase();

  const qualElem = document.getElementById("viewDocQualification");
  if (qualElem) {
    qualElem.innerHTML = `<i class="fas fa-graduation-cap text-cyan-500"></i> ${doctor.qualification || `Senior Consultant - ${specialty}`}`;
  }

  const aboutElem = document.getElementById("viewDocAbout");
  if (aboutElem) {
    aboutElem.innerText = doctor.about || `${docName} is a highly dedicated ${specialty} specialist.`;
  }

  doctorViewModal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
};

window.deleteDoctor = async (id, sourceCollection = "doctor") => {
  const result = await Swal.fire({
    title: "Delete Doctor?",
    text: "Are you sure you want to delete this profile permanently?",
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
    await deleteDoc(doc(db, sourceCollection, id));
    masterDoctorsList.delete(id);
    updateCombinedDoctorCount();
    renderDoctors();

    Swal.fire({
      title: "Deleted!",
      text: "Doctor profile removed successfully.",
      icon: "success",
      background: "#0f172a",
      color: "#f8fafc",
      timer: 1800,
      showConfirmButton: false
    });
  } catch (error) {
    console.error("Delete Error:", error);
    Swal.fire({
      title: "Failed!",
      text: "Could not remove record.",
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc"
    });
  }
};

// ===== EDIT ACTION =====
window.editDoctor = (id, doctor) => {
  editDoctorId = id;
  editSourceCollection = doctor.sourceCollection || "doctor";

  modal?.classList.remove("hidden");
  if (modalContent) modalContent.scrollTop = 0;
  document.body.classList.add("overflow-hidden");

  const dName = document.getElementById("dName");
  const dEmail = document.getElementById("dEmail");
  const dPhone = document.getElementById("dPhone");
  const dSpecialty = document.getElementById("dSpecialty");
  const dQualification = document.getElementById("dQualification");
  const dExperience = document.getElementById("dExperience");
  const dImageUrl = document.getElementById("dImageUrl");
  const dAbout = document.getElementById("dAbout");
  const startTime = document.getElementById("startTime");
  const endTime = document.getElementById("endTime");

  if (dName) dName.value = doctor.fullName || "";
  if (dEmail) dEmail.value = doctor.email || "";
  if (dPhone) dPhone.value = doctor.phone || "";
  if (dSpecialty) dSpecialty.value = doctor.specialty || "";

  if (dQualification) dQualification.value = doctor.qualification || "";
  if (dExperience) dExperience.value = doctor.experience || "";
  if (dImageUrl) dImageUrl.value = doctor.imageUrl || "";
  if (dAbout) dAbout.value = doctor.about || "";

  if (selectedSpecialty) {
    selectedSpecialty.textContent = doctor.specialty || "Select Specialty Domain";
    selectedSpecialty.classList.remove("text-slate-500");
  }

  if (startTime) startTime.value = doctor.startTime || "";
  if (endTime) endTime.value = doctor.endTime || "";

  document.querySelectorAll(".day").forEach(day => {
    day.checked = false;
  });

  if (doctor.availableDays) {
    doctor.availableDays.forEach(selectedDay => {
      document.querySelectorAll(".day").forEach(day => {
        if (day.value === selectedDay) {
          day.checked = true;
        }
      });
    });
  }
};

// ===== SPECIALTY DROPDOWN =====
const specialtyBtn = document.getElementById("specialtyBtn");
const specialtyDropdown = document.getElementById("specialtyDropdown");
const selectedSpecialty = document.getElementById("selectedSpecialty");
const specialtyInput = document.getElementById("dSpecialty");

specialtyBtn?.addEventListener("click", () => {
  specialtyDropdown?.classList.toggle("hidden");
});

document.querySelectorAll(".specialty-item").forEach(item => {
  item.addEventListener("click", () => {
    if (selectedSpecialty) {
      selectedSpecialty.textContent = item.textContent;
      selectedSpecialty.classList.remove("text-slate-500");
    }

    if (specialtyInput) specialtyInput.value = item.textContent;
    specialtyDropdown?.classList.add("hidden");
  });
});

document.addEventListener("click", (e) => {
  if (specialtyBtn && specialtyDropdown) {
    if (!specialtyBtn.contains(e.target) && !specialtyDropdown.contains(e.target)) {
      specialtyDropdown.classList.add("hidden");
    }
  }
});

// ===== EXPORT BUTTON LOGIC =====
const exportBtn = document.getElementById("exportBtn");

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const doctorsArray = typeof masterDoctorsList !== "undefined" ? Array.from(masterDoctorsList.values()) : [];

    if (!doctorsArray || doctorsArray.length === 0) {
      alert("No doctor data available to export!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Doctor Name,Email,Phone,Specialty,Available Days,Start Time,End Time\n";

    doctorsArray.forEach((doc) => {
      const rawName = doc.fullName || doc.name || doc.email || "Doctor";
      const cleanName = rawName.replace(/^(dr\.?\s*)+/gi, "").trim();

      const name = `"Dr. ${cleanName}"`;
      const email = `"${doc.email || 'N/A'}"`;
      const phone = `"${doc.phone || doc.phoneNumber || 'N/A'}"`;
      const specialty = `"${doc.specialty || 'General'}"`;

      const days = `"${doc.availableDays ? (Array.isArray(doc.availableDays) ? doc.availableDays.join(';') : doc.availableDays) : 'N/A'}"`;
      const startTime = `"${doc.startTime || 'N/A'}"`;
      const endTime = `"${doc.endTime || 'N/A'}"`;

      const row = `${name},${email},${phone},${specialty},${days},${startTime},${endTime}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    const todayDate = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `Doctor_Roster_${todayDate}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}



// ===== CUSTOM DROPDOWN LOGIC =====
const customDropdownBtn = document.getElementById('customDropdownBtn');
const customDropdownMenu = document.getElementById('customDropdownMenu');
const dropdownChevron = document.getElementById('dropdownChevron');
const selectedSpecialtyText = document.getElementById('selectedSpecialtyText');
const hiddenSelect = document.getElementById('specialtyFilter');

if (customDropdownBtn && customDropdownMenu) {
  // Toggle Menu
  customDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    customDropdownMenu.classList.toggle('hidden');
    dropdownChevron?.classList.toggle('rotate-180');
  });

  // Handle Option Select
  document.querySelectorAll('.custom-opt').forEach((optBtn) => {
    optBtn.addEventListener('click', (e) => {
      const selectedVal = e.currentTarget.getAttribute('data-value');
      const selectedText = e.currentTarget.innerText;

      // Button Text & Hidden Select Value
      if (selectedSpecialtyText) selectedSpecialtyText.innerText = selectedText;
      if (hiddenSelect) {
        hiddenSelect.value = selectedVal;
  
        renderDoctors();
      }

      // Close Dropdown
      customDropdownMenu.classList.add('hidden');
      dropdownChevron?.classList.remove('rotate-180');
    });
  });

  // Close when clicked outside
  document.addEventListener('click', (e) => {
    if (!customDropdownBtn.contains(e.target) && !customDropdownMenu.contains(e.target)) {
      customDropdownMenu.classList.add('hidden');
      dropdownChevron?.classList.remove('rotate-180');
    }
  });
}



