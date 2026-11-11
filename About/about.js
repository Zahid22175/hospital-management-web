import {
    auth,
    onAuthStateChanged,
    signOut
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
            logoutBtn?.classList.remove("hidden");

            loginBtnMobile?.classList.add("hidden");
            logoutBtnMobile?.classList.remove("hidden");
        } else {

            // Show Login, Hide Logout (Desktop & Mobile)
            loginBtn?.classList.remove("hidden");
            logoutBtn?.classList.add("hidden");

            loginBtnMobile?.classList.remove("hidden");
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

    // EQUIPMENT SECTION PROGRESS ANIMATION
    const section = document.getElementById("equipment-section");
    const bars = document.querySelectorAll(".progress-bar");
    let animated = false;

    if (section && bars.length > 0) {
        function animateProgress() {
            if (animated) return;
            animated = true;

            bars.forEach(bar => {
                const target = parseInt(bar.dataset.progress) || 0;
                const percentText = bar
                    .closest(".progress-item")
                    ?.querySelector(".percent");

                let current = 0;
                const speed = 20;

                const interval = setInterval(() => {
                    if (current >= target) {
                        clearInterval(interval);
                    } else {
                        current++;
                        bar.style.width = current + "%";
                        if (percentText) {
                            percentText.textContent = current + "%";
                        }
                    }
                }, speed);
            });
        }

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                animateProgress();
            }
        }, { threshold: 0.4 });

        observer.observe(section);
    }

});