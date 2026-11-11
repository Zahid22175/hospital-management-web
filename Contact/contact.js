import {
    auth,
    onAuthStateChanged,
    signOut,
    db,
    addDoc,
    collection,
    serverTimestamp
} from "../firebase.js";

// Book Now Form 
document.addEventListener("DOMContentLoaded", () => {
    const bookBtn = document.querySelector(".book-now-btn");

    if (bookBtn) {
        bookBtn.addEventListener("click", (e) => {
            if (!auth.currentUser) {
                e.preventDefault();

                // SessionStorage flag save 
                sessionStorage.setItem("redirectToBooking", "true");

                // redirect Login
                window.location.href = "../login/login.html";
            }
        });
    }
});

// Initialize EmailJS
emailjs.init({
    publicKey: "UV4hmNDQloLAxzCfL",
});

document.addEventListener("DOMContentLoaded", () => {

    // MOBILE MENU TOGGLE LOGIC
    const menuToggle = document.getElementById("menu-toggle");
    const closeMenuBtn = document.getElementById("close-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const menuOverlay = document.getElementById("menu-overlay");

    // Open Sidebar
    function openMenu() {
        mobileMenu?.classList.remove("-translate-x-full");
        menuOverlay?.classList.remove("hidden");

        // Lock Background Scroll
        document.body.classList.add("overflow-hidden");
        document.documentElement.classList.add("overflow-hidden");
    }

    // Close Sidebar
    function closeMenu() {
        mobileMenu?.classList.add("-translate-x-full");
        menuOverlay?.classList.add("hidden");

        // Unlock Background Scroll
        document.body.classList.remove("overflow-hidden");
        document.documentElement.classList.remove("overflow-hidden");
    }

    // Event Listeners
    menuToggle?.addEventListener("click", openMenu);
    closeMenuBtn?.addEventListener("click", closeMenu);
    menuOverlay?.addEventListener("click", closeMenu);

    // AUTHENTICATION (Desktop + Mobile)
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const loginBtnMobile = document.getElementById("login-btn-mobile");
    const logoutBtnMobile = document.getElementById("logout-btn-mobile");

    onAuthStateChanged(auth, (user) => {
        if (user) {

            // Show Logout, Hide Login (Desktop & Mobile)
            loginBtn?.classList.add("hidden");
            loginBtnMobile?.classList.add("hidden");

            logoutBtn?.classList.remove("hidden");
            logoutBtnMobile?.classList.remove("hidden");
        } else {

            // Show Login, Hide Logout (Desktop & Mobile)
            loginBtn?.classList.remove("hidden");
            loginBtnMobile?.classList.remove("hidden");

            logoutBtn?.classList.add("hidden");
            logoutBtnMobile?.classList.add("hidden");
        }
    });

    //  Logout Handler Function
    const handleLogout = (e) => {
        e.preventDefault();
        signOut(auth)
            .then(() => {
                window.location.href = "../index.html";
            })
            .catch((error) => {
                console.error("Logout Error:", error);
            });
    };

    // Event Listeners for Logout
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
    if (logoutBtnMobile) logoutBtnMobile.addEventListener("click", handleLogout);


    // EMAIL VALIDATOR FUNCTION
    const validateEmailStrict = (email) => {

        // Structure Check
        const basicRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!basicRegex.test(email)) {
            return { valid: false, message: "Please enter a valid email structure (e.g., name@gmail.com)." };
        }

        const domain = email.split("@")[1].toLowerCase();

        // Common Typo Domains List
        const invalidDomains = [
            "gmal.com", "gamil.com", "gmial.com", "gmai.com", "gmaill.com",
            "yaho.com", "yahooo.com", "yaho.co",
            "hotmai.com", "hotmial.com", "outlok.com"
        ];

        if (invalidDomains.includes(domain)) {
            return { valid: false, message: `Did you mean @gmail.com or @yahoo.com? "${domain}" seems like a typo.` };
        }

        return { valid: true };
    };


    // CONTACT FORM SUBMISSION
    const contactForm = document.getElementById("contactForm");

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("name")?.value.trim() || "";
            const email = document.getElementById("email")?.value.trim() || "";
            const subject = document.getElementById("subject")?.value.trim() || "";
            const message = document.getElementById("message")?.value.trim() || "";

            // 1. Check Empty Fields
            if (!name || !email || !subject || !message) {
                await Swal.fire({
                    icon: "warning",
                    title: "Empty Fields!",
                    text: "Please fill in all the required fields before submitting.",
                    confirmButtonColor: "#f59e0b"
                });

                // reset form
                contactForm.reset();
                return;
            }

            // 2. Email Check
            const emailCheck = validateEmailStrict(email);
            if (!emailCheck.valid) {
                await Swal.fire({
                    icon: "error",
                    title: "Invalid Email Domain!",
                    text: emailCheck.message,
                    confirmButtonColor: "#dc2626"
                });

                // reset form (invalid email error)
                contactForm.reset();
                return;
            }

            const submitBtn = contactForm.querySelector("button[type='submit']");
            const originalBtnText = submitBtn ? submitBtn.innerText : "Send Message";

            try {
                if (submitBtn) {
                    submitBtn.innerText = "Sending...";
                    submitBtn.disabled = true;
                }

                // Save to Firestore
                await addDoc(collection(db, "contacts"), {
                    name,
                    email,
                    subject,
                    message,
                    createdAt: serverTimestamp(),
                });

                // Send Email via EmailJS
                await emailjs.send(
                    "service_fe95pz5",
                    "template_hnme8d1",
                    {
                        name: name,
                        email: email,
                        subject: subject,
                        message: message,
                    }
                );

                await Swal.fire({
                    icon: "success",
                    title: "Message Sent!",
                    text: "Thank you for reaching out. We will get back to you soon.",
                    confirmButtonColor: "#2563eb"
                });

                // Successful hone par bhi form clear ho jayega
                contactForm.reset();

            } catch (error) {
                console.error("Contact Form Error:", error);

                await Swal.fire({
                    icon: "error",
                    title: "Submission Failed",
                    text: error.text || error.message || "Something went wrong. Please try again.",
                    confirmButtonColor: "#dc2626"
                });

                // reser form (Catch / Network error)
                contactForm.reset();

            } finally {
                if (submitBtn) {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

});