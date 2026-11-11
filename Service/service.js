import {
    auth,
    onAuthStateChanged,
    signOut
} from "../firebase.js";

// Book Now Form 
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Navbar Book Now button
    const bookBtn = document.querySelector(".book-now-btn");
    if (bookBtn) {
        bookBtn.addEventListener("click", (e) => {
            if (!auth.currentUser) {
                e.preventDefault();
                sessionStorage.setItem("redirectToBooking", "true");
                window.location.href = "../login/login.html";
            }
        });
    }

    // 2. 12 Cards Popup Book Now buttons 
    document.addEventListener("click", (e) => {
        const popupBookBtn = e.target.closest(".popup-book-btn");
        
        if (popupBookBtn) {
            if (!auth.currentUser) {
                e.preventDefault();
                
                // SessionStorage flag save 
                sessionStorage.setItem("redirectToBooking", "true");

                // Login page
                window.location.href = "../login/login.html";
            } else {
                // Book appointment page
                e.preventDefault();
                window.location.href = "../book-Appointment/book.html";
            }
        }
    });
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

        // Background Scroll Lock
        document.body.classList.add("overflow-hidden");
        document.documentElement.classList.add("overflow-hidden");
    }

    // Close Sidebar
    function closeMenu() {
        mobileMenu?.classList.add("-translate-x-full");
        menuOverlay?.classList.add("hidden");

        // Background Scroll Unlock
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

    // Logout Handler Function
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

    // ACTIVE NAVBAR LINK
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll("nav a");

    navLinks.forEach(link => {
        const linkPage = link.getAttribute("href")?.split("/").pop();
        if (linkPage && linkPage === currentPage) {
            link.classList.add("text-sky-500", "font-bold", "bg-blue-50");
            link.classList.remove("text-slate-600", "text-slate-700");
        }
    });

});

