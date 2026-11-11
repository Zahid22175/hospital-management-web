import {
    auth,
    db,
    onAuthStateChanged,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "../../firebase.js";

// DOM Elements
const customDoctorSelectBtn = document.getElementById("customDoctorSelectBtn");
const doctorDropdownList = document.getElementById("doctorDropdownList");
const selectedDoctorText = document.getElementById("selectedDoctorText");
const selectedDoctorIdInput = document.getElementById("selectedDoctorId");
const dropdownArrow = document.getElementById("dropdownArrow");
const appointmentForm = document.getElementById("appointmentForm");
const submitBtn = document.getElementById("submitBtn");

// Date Input Element
const dateInput = document.getElementById("appDate");
const timeInput = document.getElementById("appTime");
const reasonInput = document.getElementById("reason");

// Modal Elements
const statusModal = document.getElementById("statusModal");
const modalIconContainer = document.getElementById("modalIconContainer");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalDoctorSchedule = document.getElementById("modalDoctorSchedule");
const schedDays = document.getElementById("schedDays");
const schedTime = document.getElementById("schedTime");
const closeModalBtn = document.getElementById("closeModalBtn");

let currentPatientId = null;
let doctorsMap = {};
let isErrorPopup = false; // Check error popup

// Minimum Date Set
if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
}

// Doctor Name
function cleanDoctorName(rawName) {
    if (!rawName) return "Assigned Doctor";
    let cleaned = rawName.trim().replace(/^(dr\.?\s*)+/gi, "");
    return `Dr. ${cleaned}`;
}

// Form and Dropdown Reset
function resetAppointmentForm() {
    if (appointmentForm) {
        appointmentForm.reset(); 
    }
    if (selectedDoctorIdInput) {
        selectedDoctorIdInput.value = ""; 
    }
    if (selectedDoctorText) {
        selectedDoctorText.innerHTML = `<span class="text-slate-400">Choose Doctor...</span>`; 
    }
}

// Modal Toggle 
function showPopup({ type = "error", title, message, schedule = null }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    isErrorPopup = (type === "error");

    if (type === "error") {
        modalIconContainer.className = "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20";
        modalIconContainer.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
    } else {
        modalIconContainer.className = "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        modalIconContainer.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    }

    if (schedule) {
        modalDoctorSchedule.classList.remove("hidden");
        schedDays.textContent = schedule.days;
        schedTime.textContent = schedule.time;
    } else {
        modalDoctorSchedule.classList.add("hidden");
    }

    statusModal.classList.remove("hidden");
}

// Close Modal Event Listener
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        statusModal.classList.add("hidden");

        if (isErrorPopup) {
            resetAppointmentForm();
            isErrorPopup = false;
        }
    });
}

// Auth Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../../login/login.html";
        return;
    }
    currentPatientId = user.uid;
    await loadDoctorsList();
});

// Fetch Doctors List
async function loadDoctorsList() {
    try {
        const q = query(collection(db, "users"), where("role", "==", "doctor"));
        const querySnapshot = await getDocs(q);

        doctorDropdownList.innerHTML = "";
        doctorsMap = {};

        if (querySnapshot.empty) {
            selectedDoctorText.innerHTML = `<span class="text-slate-500 italic">No doctors available</span>`;
            return;
        }

        selectedDoctorText.innerHTML = `<span class="text-slate-400">Choose Doctor...</span>`;

        querySnapshot.forEach((docSnap) => {
            const docData = docSnap.data();
            const doctorId = docSnap.id;
            const rawName = docData.fullName || docData.name || docData.email || "Doctor";
            const formattedName = cleanDoctorName(rawName);

            doctorsMap[doctorId] = { ...docData, formattedName };

            const item = document.createElement("div");
            item.className = "p-3.5 hover:bg-slate-800/80 cursor-pointer flex items-center gap-3 transition-colors text-xs font-semibold text-slate-200";
            item.innerHTML = `
                <div class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    <i class="fa-solid fa-user-md"></i>
                </div>
                <div>
                    <p class="text-sm text-cyan-400 font-bold">${formattedName}</p>
                    <p class="text-[11px] text-slate-500">${docData.specialty || 'Medical Specialist'}</p>
                </div>
            `;

            item.addEventListener("click", () => {
                selectedDoctorIdInput.value = doctorId;
                selectedDoctorText.innerHTML = `<i class="fa-solid fa-user-check text-cyan-400"></i> <span class="text-cyan-400 font-bold">${formattedName}</span>`;
                toggleDropdown(false);
            });

            doctorDropdownList.appendChild(item);
        });

    } catch (err) {
        console.error("Firestore Fetch Error:", err);
        selectedDoctorText.innerHTML = `<span class="text-rose-400">Error loading doctors</span>`;
    }
}

// Dropdown Handlers
function toggleDropdown(show) {
    if (show === undefined) {
        doctorDropdownList.classList.toggle("hidden");
        dropdownArrow.classList.toggle("rotate-180");
    } else if (show) {
        doctorDropdownList.classList.remove("hidden");
        dropdownArrow.classList.add("rotate-180");
    } else {
        doctorDropdownList.classList.add("hidden");
        dropdownArrow.classList.remove("rotate-180");
    }
}

if (customDoctorSelectBtn) {
    customDoctorSelectBtn.addEventListener("click", () => toggleDropdown());
}

document.addEventListener("click", (e) => {
    if (!customDoctorSelectBtn.contains(e.target) && !doctorDropdownList.contains(e.target)) {
        toggleDropdown(false);
    }
});

// Availability Validation Logic
function isDoctorAvailable(docData, selectedDateStr, selectedTimeStr) {
    const todayStr = new Date().toISOString().split("T")[0];

    // Past Date Check
    if (selectedDateStr < todayStr) {
        return {
            valid: false,
            title: "Invalid Date Selected",
            message: "You cannot book an appointment for a past date.",
            showSchedule: false
        };
    }

    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dateObj = new Date(selectedDateStr + "T00:00:00");
    const selectedDayName = daysMap[dateObj.getDay()];

    const availableDays = docData.availableDays || [];
    const startTime = docData.startTime || "09:00";
    const endTime = docData.endTime || "17:00";

    const isDayValid = availableDays.some(day => day.toLowerCase().includes(selectedDayName.toLowerCase()));

    // Day Availability Check
    if (!isDayValid) {
        return {
            valid: false,
            title: "Doctor Not Available",
            message: `${docData.formattedName} does not practice on ${selectedDayName}s. Please pick another date.`,
            showSchedule: true,
            schedule: {
                days: availableDays.length ? availableDays.join(", ") : "Not set",
                time: `${startTime} - ${endTime}`
            }
        };
    }

    // Time Slot Check
    if (selectedTimeStr < startTime || selectedTimeStr > endTime) {
        return {
            valid: false,
            title: "Outside Working Hours",
            message: `Selected time slot is outside of the doctor's active hours.`,
            showSchedule: true,
            schedule: {
                days: availableDays.join(", "),
                time: `${startTime} - ${endTime}`
            }
        };
    }

    return { valid: true };
}

// Form Submit Handler
if (appointmentForm) {
    appointmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const doctorId = selectedDoctorIdInput.value;
        const selectedDate = dateInput ? dateInput.value : "";
        const selectedTime = timeInput ? timeInput.value : "";

        if (!doctorId) {
            showPopup({
                type: "error",
                title: "Doctor Required",
                message: "Please select a doctor from the list before booking."
            });
            return;
        }

        const selectedDoctor = doctorsMap[doctorId];

        if (selectedDoctor) {
            const check = isDoctorAvailable(selectedDoctor, selectedDate, selectedTime);
            if (!check.valid) {
                showPopup({
                    type: "error",
                    title: check.title,
                    message: check.message,
                    schedule: check.showSchedule ? check.schedule : null
                });
                return;
            }
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin"></i> Booking Request...`;
        }

        try {
            await addDoc(collection(db, "appointments"), {
                patientId: currentPatientId,
                doctorId: doctorId,
                date: selectedDate,
                time: selectedTime,
                reason: reasonInput ? reasonInput.value.trim() : "",
                status: "pending",
                createdAt: serverTimestamp()
            });

            showPopup({
                type: "success",
                title: "Appointment Booked!",
                message: "Your request has been submitted successfully."
            });

            setTimeout(() => {
                window.location.href = "../index.html";
            }, 1800);

        } catch (err) {
            console.error("Booking Error:", err);
            showPopup({
                type: "error",
                title: "Booking Failed",
                message: err.message
            });

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Confirm Appointment Request`;
            }
        }
    });
}