import {
  auth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  doc,
  getDoc,
  db,
  sendPasswordResetEmail
} from "../firebase.js";

// Get user role and redirect
async function redirectBasedOnRole(uid) {
  try {
    const shouldRedirect = sessionStorage.getItem("redirectToBooking");

    if (shouldRedirect === "true") {
      sessionStorage.removeItem("redirectToBooking");
      window.location.href = "../book-Appointment/book.html";
      return;
    }

    // role check 
    let role = "";
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      role = (userDocSnap.data().role || "").toLowerCase();
    } else {
      const staffDocRef = doc(db, "Staff", uid);
      const staffDocSnap = await getDoc(staffDocRef);

      if (staffDocSnap.exists()) {
        role = "staff";
      }
    }

    // Route based on user role
    if (role === "admin") {
      window.location.href = "../Admin/index.html";
    } else if (role === "doctor") {
      window.location.href = "../Doctor/index.html";
    } else if (role === "staff") {
      window.location.href = "../Staff/staff.html";
    } else if (role === "patient") {
      window.location.href = "../Patient/index.html";
    } else {
      window.location.href = "../index.html";
    }
  } catch (err) {
    console.error("Error fetching user role:", err);
    window.location.href = "../index.html";
  }
}

// Auto-redirect on Auth State Change
onAuthStateChanged(auth, (user) => {
  if (user) {
    redirectBasedOnRole(user.uid);
  }
});

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const errorBox = document.getElementById("error-box");
const errorMessage = document.getElementById("error-message");
const togglePasswordBtn = document.getElementById("togglePassword");
const eyeIcon = document.getElementById("eyeIcon");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn"); // <--- Forgot password element

// Password visibility toggle logic
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    eyeIcon.classList.toggle("fa-eye", !isPassword);
    eyeIcon.classList.toggle("fa-eye-slash", isPassword);
  });
}

// FORGOT PASSWORD LOGIC
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const { value: email } = await Swal.fire({
      title: '<div class="flex items-center justify-center gap-3 text-lg font-bold text-white"><div class="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><i class="fa-solid fa-key"></i></div> Reset Password</div>',
      html: '<p class="text-xs text-slate-400 font-medium px-2 mt-1">Please enter your registered email address to receive a password reset link.</p>',
      input: 'email',
      inputPlaceholder: 'name@example.com',
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonText: 'Send Reset Link <i class="fa-solid fa-paper-plane ml-1 text-xs"></i>',
      cancelButtonText: 'Cancel',
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl border border-slate-800/80 shadow-2xl shadow-cyan-500/10 p-6 backdrop-blur-xl w-[90%] max-w-md mx-auto',
        input: 'box-border w-full bg-slate-900 border border-slate-700/80 text-white text-sm rounded-2xl px-4 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 transition-all placeholder:text-slate-500 mt-4 block mx-auto',
        confirmButton: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer',
        cancelButton: 'bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all cursor-pointer',
        actions: 'flex gap-3 mt-6 justify-center'
      },
      preConfirm: (value) => {
        if (!value) {
          Swal.showValidationMessage(`
            <div style="background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 10px 16px; border-radius: 12px; font-size: 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
              <i class="fa-solid fa-triangle-exclamation" style="color: #f43f5e;"></i> Email address is required!
            </div>
          `);
          return false;
        }
        return value;
      }
    });

    if (email) {
      try {
        await sendPasswordResetEmail(auth, email);

        await Swal.fire({
          title: '<div class="text-lg font-bold text-white"><i class="fa-solid fa-circle-check text-emerald-400 mr-2"></i> Email Sent!</div>',
          text: 'Password reset link has been successfully sent to your email address[cite: 5].',
          background: '#0f172a',
          color: '#f8fafc',
          confirmButtonText: 'Got It',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-3xl border border-slate-800 shadow-2xl p-6 w-[90%] max-w-md mx-auto',
            confirmButton: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer'
          }
        });
      } catch (error) {
        console.error("Reset Password Error:", error);

        let errText = "An unexpected error occurred. Please try again.";
        if (error.code === 'auth/user-not-found') {
          errText = "No account found with this email address.";
        }

        await Swal.fire({
          title: '<div class="text-lg font-bold text-white"><i class="fa-solid fa-triangle-exclamation text-rose-500 mr-2"></i> Request Failed</div>',
          text: errText,
          background: '#0f172a',
          color: '#f8fafc',
          confirmButtonText: 'Try Again',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-3xl border border-slate-800 shadow-2xl p-6 w-[90%] max-w-md mx-auto',
            confirmButton: 'bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer'
          }
        });
      }
    }
  });
}

// Form Submit Event
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    errorBox.classList.add("hidden");
    loginBtn.disabled = true;
    btnText.textContent = "Logging in...";
    btnSpinner.classList.remove("hidden");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await redirectBasedOnRole(userCredential.user.uid);

    } catch (err) {
      loginBtn.disabled = false;
      btnText.textContent = "Login";
      btnSpinner.classList.add("hidden");

      let message = "Failed to login. Please try again.";
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        message = "Incorrect email or password.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      }

      errorMessage.textContent = message;
      errorBox.classList.remove("hidden");
    }

    loginForm.reset();
  });
}