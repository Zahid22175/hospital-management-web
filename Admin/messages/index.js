import {
    db,
    auth,
    signOut,
    collection,
    onSnapshot,
    doc,
    deleteDoc,
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

// ===== MOBILE SIDEBAR TOGGLE =====
document.addEventListener("DOMContentLoaded", () => {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const closeSidebarBtn = document.getElementById("closeSidebarBtn");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const openSidebar = () => {
        sidebar?.classList.remove("-translate-x-full");
        sidebarOverlay?.classList.remove("hidden");
    };

    const closeSidebar = () => {
        sidebar?.classList.add("-translate-x-full");
        sidebarOverlay?.classList.add("hidden");
    };

    sidebarToggle?.addEventListener("click", openSidebar);
    closeSidebarBtn?.addEventListener("click", closeSidebar);
    sidebarOverlay?.addEventListener("click", closeSidebar);
});

// ===== REALTIME COUNTS UI ELEMENTS =====
const doctorCount = document.getElementById("doctorCount");
const patientCount = document.getElementById("patientCount");
const appointmentCount = document.getElementById("appointmentCount");
const departmentCount = document.getElementById("departmentCount");
const staffCount = document.getElementById("staffCount");
const messageCount = document.getElementById("messageCount");

// ===== DOCTORS COUNT LOGIC =====
let usersDocCount = 0;
let adminDocCount = 0;

const updateDoctorCount = () => {
    if (doctorCount) {
        const total = usersDocCount + adminDocCount;
        doctorCount.innerText = total;
        localStorage.setItem("lastDoctorCount", total);
    }
};

// Listen to doctor collection
onSnapshot(collection(db, "doctor"), (snapshot) => {
    adminDocCount = snapshot.size;
    updateDoctorCount();
});

// ===== PATIENTS COUNT LOGIC =====
let usersPatCount = 0;
let directPatCount = 0;

const updatePatientCount = () => {
    if (patientCount) {
        const total = usersPatCount + directPatCount;
        patientCount.innerText = total;
        localStorage.setItem("lastPatientCount", total);
    }
};

// Listen to direct patient collection
onSnapshot(collection(db, "patient"), (snapshot) => {
    directPatCount = snapshot.size;
    updatePatientCount();
});

// ===== STAFF COUNT LOGIC =====
let usersStaffCount = 0;

const updateStaffCount = () => {
    if (staffCount) {
        staffCount.innerText = usersStaffCount;
        localStorage.setItem("lastStaffCount", usersStaffCount);
    }
};

// ===== LISTEN TO USERS COLLECTION (DOCTORS, PATIENTS & STAFF) =====
onSnapshot(collection(db, "users"), (snapshot) => {
    let tempDocCount = 0;
    let tempPatCount = 0;
    let tempStaffCount = 0;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.role === "doctor") tempDocCount++;
        if (data.role === "patient") tempPatCount++;
        if (data.role === "staff") tempStaffCount++;
    });

    usersDocCount = tempDocCount;
    usersPatCount = tempPatCount;
    usersStaffCount = tempStaffCount;

    updateDoctorCount();
    updatePatientCount();
    updateStaffCount(); // 
});

// ===== OTHER REALTIME COUNTERS =====
onSnapshot(collection(db, "appointments"), (snapshot) => {
    if (appointmentCount) {
        appointmentCount.textContent = snapshot.size;
        localStorage.setItem("lastAppointmentCount", snapshot.size);
    }
});

onSnapshot(collection(db, "departments"), (snapshot) => {
    if (departmentCount) {
        departmentCount.textContent = snapshot.size;
        localStorage.setItem("lastDepartmentCount", snapshot.size);
    }
});

onSnapshot(collection(db, "contacts"), (snapshot) => {
    if (messageCount) {
        messageCount.textContent = snapshot.size;
        localStorage.setItem("lastMessageCount", snapshot.size);
    }
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

// ===== MESSAGES TABLE & MODAL SYSTEM =====
const tbody = document.getElementById("messageTableBody");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("viewModal");
const details = document.getElementById("messageDetails");
const closeModal = document.getElementById("closeModal");

let allMessages = [];

// Realtime Listener for Contacts
onSnapshot(collection(db, "contacts"), (snapshot) => {
    allMessages = [];
    snapshot.forEach((docSnap) => {
        allMessages.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    renderMessages(allMessages);
});

function getFirstLetter(name) {
    if (!name) return "M";
    return name.trim().charAt(0).toUpperCase();
}

// Render Table Function
function renderMessages(messages) {
    if (!tbody) return;
    tbody.innerHTML = "";

    if (messages.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-slate-500 font-medium">
                    No messages found.
                </td>
            </tr>
        `;
        return;
    }

    messages.forEach((data, index) => {
        let dateFormatted = "N/A";

        if (data.createdAt) {
            try {
                dateFormatted = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
            } catch {
                dateFormatted = "N/A";
            }
        } else if (data.date) {
            dateFormatted = data.date;
        }

        const firstLetter = getFirstLetter(data.name);
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-800/40 transition-colors border-b border-slate-800/40";

        tr.innerHTML = `
            <td class="py-3.5 px-4 text-center text-slate-500 text-xs font-mono">#0${index + 1}</td>
            
            <td class="py-3.5 px-4 font-semibold text-white">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-xs shrink-0">
                        ${firstLetter}
                    </div>
                    <span class="truncate max-w-[120px]">${data.name || 'N/A'}</span>
                </div>
            </td>

            <td class="py-3.5 px-4 text-slate-400 font-mono text-xs truncate max-w-[150px]">${data.email || '-'}</td>
            <td class="py-3.5 px-4 font-medium text-slate-200 truncate max-w-[140px]">${data.subject || 'No Subject'}</td>
            
            <!-- Message Preview Column (Fixed width aur truncate taaki scroll na aaye aur ... aa jaye) -->
            <td class="py-3.5 px-4 text-slate-400 text-xs truncate max-w-[180px]">${data.message || '-'}</td>
            
            <td class="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">${dateFormatted}</td>

            <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-2">
                    <!-- View Icon Button -->
                    <button type="button" 
                        class="viewBtn w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                        data-id="${data.id}" title="View Details">
                        <i class="fas fa-eye text-xs"></i>
                    </button>

                    <!-- Delete Icon Button -->
                    <button type="button" 
                        class="deleteBtn w-8 h-8 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-all flex items-center justify-center cursor-pointer"
                        data-id="${data.id}" title="Delete Message">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    attachActionEvents();
}

// Action Handlers
function attachActionEvents() {

    // View Details Modal
    document.querySelectorAll(".viewBtn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const msg = allMessages.find(item => item.id === id);

            if (!msg || !details) return;

            details.innerHTML = `
                <div class="space-y-4 text-sm">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                            <span class="text-[11px] text-slate-500 uppercase font-semibold block mb-1">Sender Name</span>
                            <p class="text-white font-medium">${msg.name || "N/A"}</p>
                        </div>
                        <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                            <span class="text-[11px] text-slate-500 uppercase font-semibold block mb-1">Email Address</span>
                            <p class="text-cyan-400 font-mono text-xs break-all">${msg.email || "N/A"}</p>
                        </div>
                    </div>

                    <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                        <span class="text-[11px] text-slate-500 uppercase font-semibold block mb-1">Subject</span>
                        <p class="text-slate-200 font-medium">${msg.subject || "No Subject"}</p>
                    </div>

                    <div>
                        <span class="text-[11px] text-slate-500 uppercase font-semibold block mb-1.5">Message Content</span>
                        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 leading-relaxed text-slate-300 max-h-[220px] overflow-y-auto">
                            ${msg.message || "No Message"}
                        </div>
                    </div>
                </div>
            `;

            modal?.classList.remove("hidden");
        });
    });

    // Delete with SweetAlert2
    document.querySelectorAll(".deleteBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;

            const result = await Swal.fire({
                title: "Delete Message?",
                text: "Are you sure you want to delete this message permanently?",
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
                await deleteDoc(doc(db, "contacts", id));

                Swal.fire({
                    title: "Deleted!",
                    text: "Message removed successfully.",
                    icon: "success",
                    background: "#0f172a",
                    color: "#f8fafc",
                    timer: 1600,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("Delete Error:", error);
                Swal.fire({
                    title: "Error!",
                    text: "Failed to delete message.",
                    icon: "error",
                    background: "#0f172a",
                    color: "#f8fafc",
                    confirmButtonColor: "#f43f5e"
                });
            }
        });
    });
}

// Modal Close Event
closeModal?.addEventListener("click", () => {
    modal?.classList.add("hidden");
});

// Search Filter Input Event
searchInput?.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();

    const filtered = allMessages.filter((msg) => {
        return (
            msg.name?.toLowerCase().includes(value) ||
            msg.email?.toLowerCase().includes(value) ||
            msg.subject?.toLowerCase().includes(value)
        );
    });

    renderMessages(filtered);
});