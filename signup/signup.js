import {
  auth,
  createUserWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  db,
  serverTimestamp
} from "../firebase.js";

// DOM Elements
const signupForm = document.getElementById("signupForm");
const signupBtn = document.getElementById("signupBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const errorBox = document.getElementById("error-box");
const errorMessage = document.getElementById("error-message");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const eyeIcon = document.getElementById("eyeIcon");

// Role Switch Elements
const patientTabBtn = document.getElementById("patientTabBtn");
const doctorTabBtn = document.getElementById("doctorTabBtn");
const staffTabBtn = document.getElementById("staffTabBtn");

const commonPatientDoctorFields = document.getElementById("commonPatientDoctorFields");
const doctorTimingFields = document.getElementById("doctorTimingFields");
const staffFields = document.getElementById("staffFields");

const roleInput = document.getElementById("role");
const ageInput = document.getElementById("age");
const genderSelect = document.getElementById("gender");
const specialtySelect = document.getElementById("specialty");

const departmentSelect = document.getElementById("department");
const designationSelect = document.getElementById("designation");
const shiftSelect = document.getElementById("shift");
const statusSelect = document.getElementById("status");

// ===== Styling for Tabs =====
const activeTabClass = "py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/25 bg-gradient-to-r from-cyan-400 via-cyan-500 to-teal-600 text-slate-950 flex items-center justify-center gap-2";
const inactiveTabClass = "py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all text-slate-400 hover:text-white flex items-center justify-center gap-2";

// Patient Tab Click Logic
patientTabBtn?.addEventListener("click", () => {
  roleInput.value = "patient";
  commonPatientDoctorFields.classList.remove("hidden");
  doctorTimingFields.classList.add("hidden");
  staffFields.classList.add("hidden");

  ageInput.setAttribute("required", "true");
  genderSelect.setAttribute("required", "true");
  specialtySelect.removeAttribute("required");
  departmentSelect.removeAttribute("required");
  designationSelect.removeAttribute("required");
  shiftSelect.removeAttribute("required");
  statusSelect.removeAttribute("required");

  // active style to Patient, inactive to others
  patientTabBtn.className = activeTabClass;
  doctorTabBtn.className = inactiveTabClass;
  staffTabBtn.className = inactiveTabClass;

  btnText.textContent = "Create Patient Account";
});

// Doctor Tab Click Logic
doctorTabBtn?.addEventListener("click", () => {
  roleInput.value = "doctor";
  commonPatientDoctorFields.classList.remove("hidden");
  doctorTimingFields.classList.remove("hidden");
  staffFields.classList.add("hidden");

  ageInput.setAttribute("required", "true");
  genderSelect.setAttribute("required", "true");
  specialtySelect.setAttribute("required", "true");
  departmentSelect.removeAttribute("required");
  designationSelect.removeAttribute("required");
  shiftSelect.removeAttribute("required");
  statusSelect.removeAttribute("required");

  // active style to Doctor, inactive to others
  doctorTabBtn.className = activeTabClass;
  patientTabBtn.className = inactiveTabClass;
  staffTabBtn.className = inactiveTabClass;

  btnText.textContent = "Register as Doctor";
});

// Staff Tab Click Logic
staffTabBtn?.addEventListener("click", () => {
  roleInput.value = "staff";
  commonPatientDoctorFields.classList.add("hidden");
  doctorTimingFields.classList.add("hidden");
  staffFields.classList.remove("hidden");

  ageInput.removeAttribute("required");
  genderSelect.removeAttribute("required");
  specialtySelect.removeAttribute("required");
  departmentSelect.setAttribute("required", "true");
  designationSelect.setAttribute("required", "true");
  shiftSelect.setAttribute("required", "true");
  statusSelect.setAttribute("required", "true");

  // active style to Staff, inactive to others
  staffTabBtn.className = activeTabClass;
  patientTabBtn.className = inactiveTabClass;
  doctorTabBtn.className = inactiveTabClass;

  btnText.textContent = "Register as Staff";
});

// Staff Tab
staffTabBtn?.addEventListener("click", () => {
  roleInput.value = "staff";
  staffFields.classList.remove("hidden");
  commonPatientDoctorFields.classList.add("hidden");
  doctorTimingFields.classList.add("hidden");

  ageInput.removeAttribute("required");
  genderSelect.removeAttribute("required");
  specialtySelect.removeAttribute("required");
  departmentSelect.setAttribute("required", "true");
  designationSelect.setAttribute("required", "true");
  shiftSelect.setAttribute("required", "true");
  statusSelect.setAttribute("required", "true");

  staffTabBtn.className = activeTabClass;
  patientTabBtn.className = inactiveTabClass;
  doctorTabBtn.className = inactiveTabClass;

  btnText.textContent = "Register as Staff";
});

// Password visibility toggle
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    eyeIcon.classList.toggle("fa-eye", !isPassword);
    eyeIcon.classList.toggle("fa-eye-slash", isPassword);
  });
}

// Form Submission
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;
  const fullName = document.getElementById("name").value.trim();
  const phone = document.getElementById("phoneNumber").value.trim();
  const role = roleInput.value;

  // Reset UI State
  errorBox.classList.add("hidden");
  signupBtn.disabled = true;
  btnText.textContent = "Creating Account...";
  btnSpinner.classList.remove("hidden");

  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    let userData = {
      uid: uid,
      fullName: fullName,
      email: email,
      phone: phone,
      role: role,
      createdAt: serverTimestamp()
    };

    if (role === "staff") {
      userData.department = departmentSelect.value;
      userData.designation = designationSelect.value;
      userData.shift = shiftSelect.value;
      userData.status = statusSelect.value || "Active";
    } else if (role === "doctor") {
      userData.age = Number(ageInput.value);
      userData.gender = genderSelect.value;

      const specialty = specialtySelect.value;
      const startTime = document.getElementById("startTime")?.value || "";
      const endTime = document.getElementById("endTime")?.value || "";

      const selectedDays = [];
      document.querySelectorAll(".day-checkbox:checked").forEach((cb) => {
        selectedDays.push(cb.value);
      });

      let formattedSlot = "Not Specified";
      if (selectedDays.length > 0) {
        const daysText = selectedDays.join(", ");
        const timeText = (startTime && endTime) ? `${startTime} - ${endTime}` : "Flexible Time";
        formattedSlot = `${daysText} | ${timeText}`;
      }

      userData.specialty = specialty;
      userData.qualification = specialty;
      userData.experience = "1";
      userData.availableDays = selectedDays;
      userData.startTime = startTime;
      userData.endTime = endTime;
      userData.slot = formattedSlot;
    } else { // patient
      userData.age = Number(ageInput.value);
      userData.gender = genderSelect.value;
    }

    // 2. Save user info to Firestore
    await setDoc(doc(db, "users", uid), userData);

    // 3. Log out user 
    await signOut(auth);

    // 4. Show success alert
    await Swal.fire({
      title: "Account Created!",
      text: "Your registration was successful. Please log in to continue.",
      icon: "success",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#2563eb",
      timer: 2000,
      showConfirmButton: false
    });

    // 5. Redirect to Login Page
    window.location.href = "../login/login.html";

  } catch (err) {
    console.error("Signup Error Details:", err);

    signupBtn.disabled = false;
    btnText.textContent = role === "doctor" ? "Register as Doctor" : role === "staff" ? "Register as Staff" : "Create Patient Account";
    btnSpinner.classList.add("hidden");

    let message = err.message;
    if (err.code === "auth/email-already-in-use") {
      message = "This email is already registered. Please login instead.";
    } else if (err.code === "auth/weak-password") {
      message = "Password should be at least 6 characters long.";
    }

    // Show error in error-box container
    errorMessage.textContent = message;
    errorBox.classList.remove("hidden");

    Swal.fire({
      title: "Registration Failed!",
      text: message,
      icon: "error",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#f43f5e",
      confirmButtonText: "Try Again"
    });
  }
});

// ===== CUSTOM DROPDOWN HELPER =====
function setupCustomDropdown({ btnId, menuId, chevronId, textId, hiddenSelectId, optionClass, isStatus = false }) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  const chevron = document.getElementById(chevronId);
  const textElem = document.getElementById(textId);
  const hiddenSelect = document.getElementById(hiddenSelectId);

  if (!btn || !menu) return;

  // 1. Toggle dropdown menu on button click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    // Close all other open dropdown
    document.querySelectorAll('[id$="DropdownMenu"]').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });
    document.querySelectorAll('[id$="DropdownChevron"]').forEach(c => {
      if (c !== chevron) c.classList.remove('rotate-180');
    });

    menu.classList.toggle('hidden');
    chevron?.classList.toggle('rotate-180');
  });

  // 2. Handle option selection
  document.querySelectorAll(`.${optionClass}`).forEach((optBtn) => {
    optBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedVal = e.currentTarget.getAttribute('data-value');
      const selectedText = e.currentTarget.innerText;

      // displayed button text & colors
      if (textElem) {
        textElem.innerText = selectedText;
        textElem.classList.remove('text-slate-400', 'text-slate-500');

        if (!isStatus) {
          textElem.classList.add('text-white');
        } else {
          // Dynamic status colors
          textElem.className = "truncate font-semibold " +
            (selectedVal === "Active" ? "text-emerald-400" : selectedVal === "On Leave" ? "text-amber-400" : "text-rose-400");
        }
      }

      // Form submit compatibility
      if (hiddenSelect) {
        hiddenSelect.value = selectedVal;
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Close dropdown menu
      menu.classList.add('hidden');
      chevron?.classList.remove('rotate-180');
    });
  });
}

// ===== ALL CUSTOM DROPDOWNS (PATIENT, DOCTOR & STAFF) =====
setupCustomDropdown({
  btnId: 'genderDropdownBtn',
  menuId: 'genderDropdownMenu',
  chevronId: 'genderDropdownChevron',
  textId: 'genderSelectedText',
  hiddenSelectId: 'gender',
  optionClass: 'gender-opt'
});

setupCustomDropdown({
  btnId: 'formDropdownBtn',
  menuId: 'formDropdownMenu',
  chevronId: 'formDropdownChevron',
  textId: 'formSelectedText',
  hiddenSelectId: 'specialty',
  optionClass: 'form-opt'
});

setupCustomDropdown({
  btnId: 'desigDropdownBtn',
  menuId: 'desigDropdownMenu',
  chevronId: 'desigDropdownChevron',
  textId: 'desigSelectedText',
  hiddenSelectId: 'designation',
  optionClass: 'desig-opt'
});

setupCustomDropdown({
  btnId: 'deptDropdownBtn',
  menuId: 'deptDropdownMenu',
  chevronId: 'deptDropdownChevron',
  textId: 'deptSelectedText',
  hiddenSelectId: 'department',
  optionClass: 'dept-opt'
});

setupCustomDropdown({
  btnId: 'shiftDropdownBtn',
  menuId: 'shiftDropdownMenu',
  chevronId: 'shiftDropdownChevron',
  textId: 'shiftSelectedText',
  hiddenSelectId: 'shift',
  optionClass: 'shift-opt'
});

setupCustomDropdown({
  btnId: 'statusDropdownBtn',
  menuId: 'statusDropdownMenu',
  chevronId: 'statusDropdownChevron',
  textId: 'statusSelectedText',
  hiddenSelectId: 'status',
  optionClass: 'status-opt',
  isStatus: true
});

// ===== CLOSE ALL OPEN DROPDOWNS WHEN CLICKING OUTSIDE =====
document.addEventListener('click', (e) => {
  document.querySelectorAll('[id$="DropdownMenu"]').forEach(menu => menu.classList.add('hidden'));
  document.querySelectorAll('[id$="DropdownChevron"]').forEach(chv => chv.classList.remove('rotate-180'));
});