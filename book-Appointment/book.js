import {
  auth,
  db,
  addDoc,
  collection,
  serverTimestamp,
  onAuthStateChanged,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  signOut
} from "../firebase.js";

// DOM ELEMENTS
const bookingForm = document.getElementById("bookingForm");
const patientName = document.getElementById("patientName");
const doctorSelect = document.getElementById("doctor");
const datetimeInput = document.getElementById("datetime");
const reasonInput = document.getElementById("reason");
const submitBtn = document.getElementById("submitBtn");

// CUSTOM DROPDOWN ELEMENTS
const dropdownToggle = document.getElementById("dropdownToggle");
const selectedDoctorText = document.getElementById("selectedDoctorText");
const dropdownMenu = document.getElementById("dropdownMenu");
const dropdownArrow = document.getElementById("dropdownArrow");

let doctorsMap = {};

// SWEETALERT MODAL CONFIGURATION
const swalConfig = {
  background: "#0f172a",
  color: "#f8fafc",
  confirmButtonColor: "#0284c7",
  cancelButtonColor: "#334155"
};

// Helper function to reset form and custom dropdown state
function resetBookingForm() {
  if (bookingForm) bookingForm.reset();
  if (selectedDoctorText) {
    selectedDoctorText.textContent = "Choose Specialist";
    selectedDoctorText.classList.remove("text-slate-900");
    selectedDoctorText.classList.add("text-slate-400");
  }
}

// Set minimum date-time to current moment
if (datetimeInput) {
  const today = new Date().toISOString().slice(0, 16);
  datetimeInput.min = today;
}

// CUSTOM DROPDOWN INTERACTION LOGIC
if (dropdownToggle && dropdownMenu) {
  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
    dropdownArrow?.classList.toggle("rotate-180");
  });

  document.addEventListener("click", () => {
    dropdownMenu.classList.add("hidden");
    dropdownArrow?.classList.remove("rotate-180");
  });
}

// AUTHENTICATION CHECK & AUTO-FILL PATIENT NAME
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      patientName.value = (userData.role === "patient" && userData.fullName) ? userData.fullName : (user.displayName || "Patient");
    } else {
      patientName.value = user.displayName || "Patient";
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    patientName.value = user.displayName || "Patient";
  }
});

// LIVE FETCH DOCTORS FROM users COLLECTION
const doctorsQuery = query(collection(db, "users"), where("role", "==", "doctor"));

onSnapshot(doctorsQuery, (snapshot) => {
  doctorSelect.innerHTML = `<option value="">Choose Specialist</option>`;
  if (dropdownMenu) dropdownMenu.innerHTML = "";
  doctorsMap = {};

  if (snapshot.empty) {
    doctorSelect.innerHTML = `<option value="">No doctors available</option>`;
    if (dropdownMenu) {
      dropdownMenu.innerHTML = `<div class="px-4 py-3 text-xs text-slate-400 text-center">No doctors available</div>`;
    }
    return;
  }

  snapshot.forEach((docSnap) => {
    const doctorData = docSnap.data();
    const docId = docSnap.id;

    doctorsMap[docId] = { id: docId, ...doctorData };

    const docName = doctorData.fullName ?
      (doctorData.fullName.startsWith("Dr.") ? doctorData.fullName : `Dr. ${doctorData.fullName}`)
      : "Doctor";

    const specialtyText = doctorData.specialty || 'Medical Specialist';
    const fullOptionText = `${docName} (${specialtyText})`;

    // 1. Backend validation & submission option
    const option = document.createElement("option");
    option.value = docId;
    option.textContent = fullOptionText;
    doctorSelect.appendChild(option);

    // 2. Custom Dropdown Menu
    if (dropdownMenu) {
      const item = document.createElement("div");
      item.className = "flex items-center gap-3 px-4 py-3 hover:bg-sky-50 cursor-pointer transition-colors text-sm font-semibold text-slate-700";
      item.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center text-xs shrink-0">
          <i class="fa-solid fa-user-doctor"></i>
        </div>
        <div>
          <div class="text-slate-900">${docName}</div>
          <div class="text-[11px] text-slate-400 font-medium">${specialtyText}</div>
        </div>
      `;

      item.addEventListener("click", () => {
        doctorSelect.value = docId; // Set value to hidden native select
        if (selectedDoctorText) {
          selectedDoctorText.textContent = fullOptionText;
          selectedDoctorText.classList.remove("text-slate-400");
          selectedDoctorText.classList.add("text-slate-900");
        }

        dropdownMenu.classList.add("hidden");
        dropdownArrow?.classList.remove("rotate-180");

        // Trigger change event if needed
        doctorSelect.dispatchEvent(new Event("change"));
      });

      dropdownMenu.appendChild(item);
    }
  });
}, (error) => {
  console.error("Doctors fetching error:", error);
  doctorSelect.innerHTML = `<option value="">Error loading doctors</option>`;
  if (dropdownMenu) {
    dropdownMenu.innerHTML = `<div class="px-4 py-3 text-xs text-red-500 text-center">Error loading doctors</div>`;
  }
});

// BOOK APPOINTMENT SUBMIT HANDLER
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({
      ...swalConfig,
      icon: "warning",
      title: "Login Required",
      text: "Please login first to book an appointment.",
    });
    return;
  }

  const name = patientName.value.trim();
  const selectedDoctorId = doctorSelect.value;
  const rawDateTime = datetimeInput.value;
  const visitReason = reasonInput.value.trim();

  // FORM VALIDATIONS 
  if (name.length < 3) {
    await Swal.fire({
      ...swalConfig,
      icon: "warning",
      title: "Invalid Name",
      text: "Please enter a valid full name (at least 3 characters).",
    });
    resetBookingForm();
    return;
  }

  if (!selectedDoctorId) {
    await Swal.fire({
      ...swalConfig,
      icon: "warning",
      title: "Select Doctor",
      text: "Please choose a doctor from the list.",
    });
    resetBookingForm();
    return;
  }

  if (!rawDateTime) {
    await Swal.fire({
      ...swalConfig,
      icon: "warning",
      title: "Select Date & Time",
      text: "Please choose an appointment date and time.",
    });
    resetBookingForm();
    return;
  }

  const [datePart, timePart] = rawDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  const now = new Date();

  if (appointmentDate < now) {
    await Swal.fire({
      ...swalConfig,
      icon: "error",
      title: "Invalid Date",
      text: "You cannot book appointments for past dates.",
      confirmButtonColor: "#f43f5e",
    });
    resetBookingForm();
    return;
  }

  if (visitReason.length < 3) {
    await Swal.fire({
      ...swalConfig,
      icon: "warning",
      title: "Reason Required",
      text: "Please enter a brief medical concern/reason.",
    });
    resetBookingForm();
    return;
  }

  // DOCTOR SCHEDULE & WORKING HOURS VALIDATION
  const doctorInfo = doctorsMap[selectedDoctorId];
  if (doctorInfo) {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const selectedDay = weekDays[appointmentDate.getDay()];

    if (doctorInfo.availableDays && doctorInfo.availableDays.length > 0) {
      const isDayAvailable = doctorInfo.availableDays.some(d =>
        d.toLowerCase().startsWith(selectedDay.toLowerCase()) ||
        selectedDay.toLowerCase().startsWith(d.toLowerCase())
      );

      if (!isDayAvailable) {
        const daysBadges = doctorInfo.availableDays
          .map(day => `<span style="display:inline-block; background:#0369a1; color:#f0f9ff; padding:4px 10px; border-radius:6px; margin:2px; font-size:12px; font-weight:600;">${day}</span>`)
          .join(" ");

        await Swal.fire({
          ...swalConfig,
          icon: "info",
          title: "Doctor Unavailable",
          html: `<p style="margin-bottom:8px;">Doctor is not available on <strong>${selectedDay}</strong>.</p><div><strong>Available Days:</strong><br>${daysBadges}</div>`,
        });
        resetBookingForm();
        return;
      }
    }

    if (doctorInfo.startTime && doctorInfo.endTime) {
      const selectedMinutes = hours * 60 + minutes;
      const [sh, sm] = doctorInfo.startTime.split(":").map(Number);
      const [eh, em] = doctorInfo.endTime.split(":").map(Number);

      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;

      if (selectedMinutes < startMinutes || selectedMinutes > endMinutes) {
        await Swal.fire({
          ...swalConfig,
          icon: "info",
          title: "Outside Working Hours",
          text: `Doctor is available only between ${doctorInfo.startTime} and ${doctorInfo.endTime}.`,
        });
        resetBookingForm();
        return;
      }
    }
  }

  // UI SPINNER STATE
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> <span>Booking...</span>`;

  // APPOINTMENT DATA PAYLOAD
  const doctorDisplayName = doctorInfo?.fullName ?
    (doctorInfo.fullName.startsWith("Dr.") ? doctorInfo.fullName : `Dr. ${doctorInfo.fullName}`)
    : "Doctor";

  const dateStr = appointmentDate.toISOString().split("T")[0];
  const timeStr = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const appointmentData = {
    patientName: name,
    patientId: user.uid,
    doctorId: selectedDoctorId,
    doctor: doctorDisplayName,
    date: dateStr,
    time: timeStr,
    datetime: rawDateTime,
    reason: visitReason,
    status: "Pending",
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "appointments"), appointmentData);

    resetBookingForm();

    await Swal.fire({
      ...swalConfig,
      icon: "success",
      title: "Appointment Booked!",
      text: "Your appointment request has been scheduled successfully.",
      confirmButtonColor: "#10b981",
      timer: 2000,
      showConfirmButton: false,
    });

    window.location.href = "../Patient/index.html";

  } catch (error) {
    console.error("Booking Error:", error);
    await Swal.fire({
      ...swalConfig,
      icon: "error",
      title: "Booking Failed",
      text: error.message || "An error occurred while booking. Please try again.",
      confirmButtonColor: "#f43f5e",
    });
    resetBookingForm();
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Confirm & Schedule</span> <i class="fa-solid fa-arrow-right text-sm"></i>`;
  }
});

// MOBILE HAMBURGER MENU LOGIC
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const closeDrawerBtn = document.getElementById("close-drawer-btn");
const mobileDrawer = document.getElementById("mobile-drawer");
const mobileOverlay = document.getElementById("mobile-overlay");

function openMobileMenu() {
  mobileDrawer?.classList.remove("-translate-x-full");
  mobileOverlay?.classList.remove("opacity-0", "pointer-events-none");
  document.body.style.overflow = "hidden";
}

function closeMobileMenu() {
  mobileDrawer?.classList.add("-translate-x-full");
  mobileOverlay?.classList.add("opacity-0", "pointer-events-none");
  document.body.style.overflow = "";
}

mobileMenuBtn?.addEventListener("click", openMobileMenu);
closeDrawerBtn?.addEventListener("click", closeMobileMenu);
mobileOverlay?.addEventListener("click", closeMobileMenu);

// --- LOGOUT FUNCTIONALITY ---
const logoutBtn = document.getElementById("logout-btn");
const logoutBtnMobile = document.getElementById("logout-btn-mobile");

async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "../index.html";
  } catch (error) {
    console.error("Logout Error:", error);
    Swal.fire({
      ...swalConfig,
      icon: "error",
      title: "Logout Failed",
      text: "Something went wrong while logging out.",
    });
  }
}

logoutBtn?.addEventListener("click", handleLogout);
logoutBtnMobile?.addEventListener("click", handleLogout);