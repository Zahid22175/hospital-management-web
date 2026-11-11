import {
  auth,
  onAuthStateChanged,
  signOut,
  db,
  collection,
  getDocs
} from "../firebase.js";

// Book Now Form 
document.addEventListener("DOMContentLoaded", () => {

  const bookingButtons = document.querySelectorAll(".popup-book-btn");

  bookingButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      
      if (!auth.currentUser) {
        e.preventDefault(); 
        
        sessionStorage.setItem("redirectToBooking", "true");
        
        // Login page redirect
        window.location.href = "./login/login.html";
      } else {
        e.preventDefault();
        sessionStorage.removeItem("redirectToBooking");
        window.location.href = "./book-Appointment/book.html";
      }
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {

  // Set minimum selectable date to Today for Search Input
  const dateInput = document.getElementById("searchAppointmentDate");
  if (dateInput) {
    const todayStr = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", todayStr);
  }

  // MOBILE MENU TOGGLE LOGIC
  const menuToggle = document.getElementById("menu-toggle");
  const closeMenuBtn = document.getElementById("close-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuOverlay = document.getElementById("menu-overlay");

  // Open Menu Function
  function openMenu() {
    mobileMenu?.classList.remove("-translate-x-full");
    menuOverlay?.classList.remove("hidden");

    // Page scroll Block
    document.body.classList.add("overflow-hidden");
    document.documentElement.classList.add("overflow-hidden");
  }

  // Close Menu Function
  function closeMenu() {
    mobileMenu?.classList.add("-translate-x-full");
    menuOverlay?.classList.add("hidden");

    // Page scroll enable
    document.body.classList.remove("overflow-hidden");
    document.documentElement.classList.remove("overflow-hidden");
  }

  // Event Listeners
  menuToggle?.addEventListener("click", openMenu);
  closeMenuBtn?.addEventListener("click", closeMenu);
  menuOverlay?.addEventListener("click", closeMenu);

  // GENERAL SECTION ANIMATIONS
  const sections = document.querySelectorAll(".animate-section");
  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const items = entry.target.querySelectorAll(
              ".animate-bottom, .animate-pop, .animate-left, .animate-right"
            );

            items.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add("animate-show");
              }, index * 100);
            });

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  // SERVICES SECTION ANIMATION
  const serviceSection = document.getElementById("serviceSection");
  if (serviceSection) {
    const parents = serviceSection.querySelectorAll("[data-animate]");
    const children = serviceSection.querySelectorAll("[data-child]");

    const serviceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            parents.forEach((el) => {
              el.classList.remove("opacity-0", "-translate-x-24", "translate-x-24");
            });

            children.forEach((el) => {
              el.classList.remove("opacity-0", "translate-y-10");
            });

            serviceObserver.unobserve(serviceSection);
          }
        });
      },
      { threshold: 0.35 }
    );

    serviceObserver.observe(serviceSection);
  }

  // HERO BANNER SLIDER
  const slider = document.getElementById("slider");
  const next = document.getElementById("next");
  const prev = document.getElementById("prev");

  if (slider && next && prev && slider.children.length > 0) {
    let slides = slider.children;
    let index = 1;
    const speed = 700;

    const firstClone = slides[0].cloneNode(true);
    const lastClone = slides[slides.length - 1].cloneNode(true);

    slider.appendChild(firstClone);
    slider.insertBefore(lastClone, slides[0]);

    const totalSlides = slider.children.length;
    slider.style.transform = `translateX(-100%)`;

    const moveSlider = () => {
      slider.style.transition = `transform ${speed}ms ease-in-out`;
      slider.style.transform = `translateX(-${index * 100}%)`;
    };

    next.addEventListener("click", () => {
      if (index >= totalSlides - 1) return;
      index++;
      moveSlider();
    });

    prev.addEventListener("click", () => {
      if (index <= 0) return;
      index--;
      moveSlider();
    });

    slider.addEventListener("transitionend", () => {
      if (slider.children[index] === firstClone) {
        slider.style.transition = "none";
        index = 1;
        slider.style.transform = `translateX(-100%)`;
      }

      if (slider.children[index] === lastClone) {
        slider.style.transition = "none";
        index = totalSlides - 2;
        slider.style.transform = `translateX(-${index * 100}%)`;
      }
    });
  }

  // FETCH LIVE DOCTORS & SEARCH DROPDOWN 
  const docPopover = document.getElementById("docMenuPopover");
  const docTrigger = document.getElementById("docSelectTrigger");
  const docArrow = document.getElementById("docArrowIcon");
  const docHiddenInput = document.getElementById("searchDoctorSelect");
  const docSelectedName = document.getElementById("docSelectedName");
  const docSearchInput = document.getElementById("docSearchInput");
  const docListContainer = document.getElementById("docListContainer");

  let doctorsMap = {};
  let rawDoctorsList = [];

  async function loadDoctorsFromFirebase() {
    if (!docListContainer) return;

    try {
      docListContainer.innerHTML = `<div class="p-3 text-cyan-400 text-xs text-center"><i class="fa-solid fa-spinner animate-spin mr-1"></i> Loading doctors...</div>`;

      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      doctorsMap = {};
      rawDoctorsList = [];
      docListContainer.innerHTML = "";

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.role && data.role.toString().toLowerCase() === "doctor") {
          const docName = data.fullName || data.name || "Dr. Unknown";
          const specialty = data.specialty || data.qualification || "Specialist";
          
          doctorsMap[docName] = data;
          rawDoctorsList.push({ name: docName, specialty: specialty, data: data });
        }
      });

      renderDoctorOptions(rawDoctorsList);

    } catch (err) {
      console.error("Firebase Fetch Error:", err);
      docListContainer.innerHTML = `<div class="p-3 text-xs text-rose-500 text-center font-bold">Failed: ${err.message || err.code}</div>`;
    }
  }

  function renderDoctorOptions(list) {
    if (!docListContainer) return;
    docListContainer.innerHTML = "";
  
    if (list.length === 0) {
      docListContainer.innerHTML = `<div class="p-2.5 text-xs text-slate-400 text-center">No doctors found</div>`;
      return;
    }
  
    list.forEach((doc) => {
      const item = document.createElement("div");
  
      item.className = "doc-option py-2 px-3 hover:bg-cyan-500/20 cursor-pointer transition-colors flex flex-col justify-center border-b border-slate-100 last:border-0";
      item.innerHTML = `
        <div class="text-xs font-semibold text-slate-800 leading-tight">${doc.name}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 leading-tight">${doc.specialty}</div>
      `;
      item.dataset.doctor = doc.name;
      docListContainer.appendChild(item);
    });
  }

  loadDoctorsFromFirebase();

  // Search filter inside dropdown
  if (docSearchInput) {
    docSearchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = rawDoctorsList.filter(doc => 
        doc.name.toLowerCase().includes(query) || doc.specialty.toLowerCase().includes(query)
      );
      renderDoctorOptions(filtered);
    });
  }

  function closeDocDropdown() {
    if (docPopover && docArrow) {
      docPopover.classList.add("hidden");
      docArrow.style.transform = "rotate(0deg)";
      if (docSearchInput) docSearchInput.value = "";
      renderDoctorOptions(rawDoctorsList); // reset list view
    }
  }

  if (docTrigger && docPopover) {
    docTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isClosed = docPopover.classList.contains("hidden");
      if (isClosed) {
        docPopover.classList.remove("hidden");
        if (docArrow) docArrow.style.transform = "rotate(180deg)";
      } else {
        closeDocDropdown();
      }
    });

    docPopover.addEventListener("click", (e) => {
      const option = e.target.closest(".doc-option");
      if (option) {
        const doctorName = option.dataset.doctor;
        if (docSelectedName) {
          docSelectedName.innerText = doctorName;
          docSelectedName.classList.remove("text-slate-400");
          docSelectedName.classList.add("text-slate-800");
        }
        if (docHiddenInput) docHiddenInput.value = doctorName;
        closeDocDropdown();
      }
    });

    document.addEventListener("click", (e) => {
      const container = document.getElementById("customDropdownContainer");
      if (container && !container.contains(e.target)) {
        closeDocDropdown();
      }
    });
  }

  // DOCTOR AVAILABILITY SEARCH & MODAL LOGIC
  const form = document.getElementById("doctorSearchForm");
  const modal = document.getElementById("doctorModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const closeModalFooter = document.getElementById("closeModalFooter");

  if (form && modal) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const selectedDateValue = document.getElementById("searchAppointmentDate")?.value;
      const selectedDoctor = document.getElementById("searchDoctorSelect")?.value;

      if (!selectedDoctor) {
        alert("Please select a doctor first.");
        return;
      }

      if (!selectedDateValue) {
        alert("Please select a date.");
        return;
      }

      // Past Date Check Logic
      const [year, month, day] = selectedDateValue.split("-").map(Number);
      const selectedDateObj = new Date(year, month - 1, day);
      selectedDateObj.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDateObj < today) {
        showModalError(
          "Invalid Date",
          `You selected a past date (${selectedDateValue}). Please select today or a future date.`
        );
        resetSearchForm();
        return;
      }

      showModalLoading(selectedDoctor, selectedDateValue);
      modal.classList.remove("hidden");

      try {
        const docInfo = doctorsMap[selectedDoctor];

        if (!docInfo) {
          showModalError("Doctor Not Found", `Doctor "${selectedDoctor}" details are missing.`);
          resetSearchForm();
          return;
        }

        const dayOfWeekNum = selectedDateObj.getDay();
        const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const selectedDayShort = shortDays[dayOfWeekNum];

        let isAvailable = false;
        let slotDaysText = "N/A";
        let timingText = "N/A";

        if (docInfo.slot) {
          const parts = docInfo.slot.split("|");
          slotDaysText = parts[0] ? parts[0].trim() : "";
          timingText = parts[1] ? parts[1].trim() : "";

          if (slotDaysText.toLowerCase().includes(selectedDayShort.toLowerCase())) {
            isAvailable = true;
          }
        }

        updateModalData({
          name: docInfo.fullName || docInfo.name || selectedDoctor,
          specialty: docInfo.specialty || docInfo.qualification || "Specialist",
          date: selectedDateValue,
          days: slotDaysText,
          timing: timingText,
          info: docInfo.experience ? `${docInfo.experience} years experience` : "No extra info.",
          isAvailable: isAvailable
        });
      } catch (err) {
        console.error("Search error:", err);
        showModalError("Error", "Could not check availability. Please try again.");
      } finally {
        resetSearchForm();
      }
    });

    function resetSearchForm() {
      form.reset();
      if (docSelectedName) docSelectedName.innerText = "Select A Doctor";
      if (docHiddenInput) docHiddenInput.value = "";
    }

    function showModalLoading(doctorName, dateStr) {
      const modalDoctorName = document.getElementById("modalDoctorName");
      const modalSelectedDate = document.getElementById("modalSelectedDate");
      if (modalDoctorName) modalDoctorName.innerText = doctorName;
      if (modalSelectedDate) modalSelectedDate.innerText = dateStr;

      let alertContainer = getOrCreateAlertContainer();
      alertContainer.innerHTML = `
        <div class="bg-sky-50 border border-sky-200 text-sky-700 px-4 py-3 rounded-xl flex items-center gap-3 mb-4">
          <i class="fa-solid fa-spinner animate-spin text-xl text-sky-500 shrink-0"></i>
          <div>
            <h5 class="font-bold text-xs">Checking Schedule...</h5>
            <p class="text-[11px] text-sky-600 mt-0.5">Fetching doctor data from database.</p>
          </div>
        </div>
      `;
    }

    function updateModalData(data) {
      const modalDoctorName = document.getElementById("modalDoctorName");
      const modalDoctorSpecialty = document.getElementById("modalDoctorSpecialty");
      const modalSelectedDate = document.getElementById("modalSelectedDate");
      const modalAvailableDays = document.getElementById("modalAvailableDays");
      const modalTiming = document.getElementById("modalTiming");
      const modalExtraInfo = document.getElementById("modalExtraInfo");

      if (modalDoctorName) modalDoctorName.innerText = data.name;
      if (modalDoctorSpecialty) modalDoctorSpecialty.innerText = data.specialty;
      if (modalSelectedDate) modalSelectedDate.innerText = data.date;
      if (modalAvailableDays) modalAvailableDays.innerText = data.days;
      if (modalTiming) modalTiming.innerText = data.timing;
      if (modalExtraInfo) modalExtraInfo.innerText = data.info;

      let alertContainer = getOrCreateAlertContainer();
      const bookBtn = document.getElementById("bookDirectBtn");

      if (!data.isAvailable) {
        alertContainer.innerHTML = `
          <div class="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 mb-4">
            <i class="fa-solid fa-circle-xmark text-xl text-rose-500 shrink-0"></i>
            <div>
              <h5 class="font-bold text-xs">Doctor Unavailable On This Day</h5>
              <p class="text-[11px] text-rose-600 mt-0.5">
                ${data.name} is available on <strong>${data.days}</strong>. Please select a valid day.
              </p>
            </div>
          </div>
        `;

        if (bookBtn) {
          bookBtn.classList.add("opacity-50", "pointer-events-none");
          bookBtn.innerText = "Unavailable";
        }
      } else {
        alertContainer.innerHTML = `
          <div class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex
           items-center gap-3 mb-4">
            <i class="fa-solid fa-circle-check text-xl text-emerald-500 shrink-0"></i>
            <div>
              <h5 class="font-bold text-xs">Doctor Available</h5>
              <p class="text-[11px] text-emerald-600 mt-0.5">
                Doctor is available on this date during scheduled hours.
              </p>
            </div>
          </div>
        `;

        if (bookBtn) {
          bookBtn.classList.remove("opacity-50", "pointer-events-none");
          bookBtn.innerText = "Book Appointment";
        }
      }
    }

    function showModalError(title, message) {
      let alertContainer = getOrCreateAlertContainer();
      alertContainer.innerHTML = `
        <div class="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 mb-4">
          <i class="fa-solid fa-triangle-exclamation text-xl text-rose-500 shrink-0"></i>
          <div>
            <h5 class="font-bold text-xs">${title}</h5>
            <p class="text-[11px] text-rose-600 mt-0.5">${message}</p>
          </div>
        </div>
      `;
      modal.classList.remove("hidden");
    }

    function getOrCreateAlertContainer() {
      let alertContainer = document.getElementById("availabilityAlert");
      if (!alertContainer) {
        alertContainer = document.createElement("div");
        alertContainer.id = "availabilityAlert";
        const modalBody = modal.querySelector(".p-6") || modal;
        modalBody.insertBefore(alertContainer, modalBody.firstChild);
      }
      return alertContainer;
    }

    const hideModal = () => {
      modal.classList.add("hidden");
    };

    if (closeModalBtn) closeModalBtn.addEventListener("click", hideModal);
    if (closeModalFooter) closeModalFooter.addEventListener("click", hideModal);

    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal();
      }
    });
  }


  // AUTHENTICATION (Desktop + Mobile)
  const logoutBtn = document.getElementById("logout-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtnMobile = document.getElementById("logout-btn-mobile");
  const loginBtnMobile = document.getElementById("login-btn-mobile");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginBtn?.classList.add("hidden");
      loginBtnMobile?.classList.add("hidden");

      logoutBtn?.classList.remove("hidden");
      logoutBtnMobile?.classList.remove("hidden");
    } else {
      logoutBtn?.classList.add("hidden");
      logoutBtnMobile?.classList.add("hidden");

      loginBtn?.classList.remove("hidden");
      loginBtnMobile?.classList.remove("hidden");
    }
  });

  // Logout Handler Function
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        window.location.href = "./login/login.html";
      })
      .catch((err) => {
        console.error("Logout error:", err);
      });
  };

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (logoutBtnMobile) logoutBtnMobile.addEventListener("click", handleLogout);

  // PRICE SLIDER CARDS
  const track = document.getElementById("priceSliderTrack");
  const nextBtn = document.getElementById("priceNextBtn");
  const prevBtn = document.getElementById("pricePrevBtn");

  if (track && nextBtn && prevBtn) {
    let isMoving = false;

    nextBtn.addEventListener("click", () => {
      if (isMoving || !track.children.length) return;
      isMoving = true;

      const firstCard = track.children[0];
      const cardWidth = firstCard.getBoundingClientRect().width;
      const gap = 24;
      const distance = cardWidth + gap;

      track.style.transition = "transform 0.4s ease-out";
      track.style.transform = `translateX(-${distance}px)`;

      track.addEventListener("transitionend", function handler() {
        track.style.transition = "none";
        track.appendChild(firstCard);
        track.style.transform = "translateX(0)";
        track.removeEventListener("transitionend", handler);
        isMoving = false;
      });
    });

    prevBtn.addEventListener("click", () => {
      if (isMoving || !track.children.length) return;
      isMoving = true;

      const lastCard = track.children[track.children.length - 1];
      const cardWidth = lastCard.getBoundingClientRect().width;
      const gap = 24;
      const distance = cardWidth + gap;

      track.style.transition = "none";
      track.insertBefore(lastCard, track.children[0]);
      track.style.transform = `translateX(-${distance}px)`;

      track.offsetHeight;

      track.style.transition = "transform 0.4s ease-out";
      track.style.transform = "translateX(0)";

      track.addEventListener("transitionend", function handler() {
        track.removeEventListener("transitionend", handler);
        isMoving = false;
      });
    });
  }

  // DOCTOR DETAILS CARDS MODAL
  const drModal = document.getElementById("fullDetailDrModal");
  const drModalPanel = document.getElementById("fullDetailDrPanel");
  const drBackdrop = document.getElementById("fullDetailDrBackdrop");
  const drCloseBtn = document.getElementById("fullDrCloseX");

  if (drModal && drModalPanel) {
    document.querySelectorAll(".js-app-dr-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;

        const d = card.dataset;

        const imgEl = document.getElementById("fullDrImg");
        const nameEl = document.getElementById("fullDrName");
        const badgeEl = document.getElementById("fullDrBadge");
        const degreesEl = document.getElementById("fullDrDegrees");
        const ratingEl = document.getElementById("fullDrRating");
        const expEl = document.getElementById("fullDrExp");
        const patientsEl = document.getElementById("fullDrPatients");
        const hoursEl = document.getElementById("fullDrHours");
        const bioEl = document.getElementById("fullDrBio");

        if (imgEl) imgEl.src = d.image || "";
        if (nameEl) nameEl.textContent = d.name || "";
        if (badgeEl) badgeEl.textContent = d.badge || "";
        if (degreesEl) degreesEl.querySelector("span").textContent = d.degrees || "";
        if (ratingEl) ratingEl.textContent = `(${d.rating || "0"})`;
        if (expEl) expEl.textContent = d.experience || "";
        if (patientsEl) patientsEl.textContent = d.patients || "";
        if (hoursEl) hoursEl.textContent = `Clinic Regular Hours: ${d.hours || ""}`;
        if (bioEl) bioEl.textContent = d.bio || "";

        const servicesContainer = document.getElementById("fullDrServices");
        if (servicesContainer) {
          servicesContainer.innerHTML = "";
          if (d.services) {
            try {
              const servicesList = JSON.parse(d.services);
              servicesList.forEach((service) => {
                const item = document.createElement("div");
                item.className =
                  "bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold text-slate-700";
                item.innerHTML = `<i class="fa-solid fa-circle-check text-sky-500 text-xs shrink-0"></i> <span>${service}</span>`;
                servicesContainer.appendChild(item);
              });
            } catch (err) {
              console.error("Invalid JSON format in data-services:", err);
            }
          }
        }

        drModal.classList.remove("hidden");
        setTimeout(() => {
          drModal.classList.add("opacity-100");
          drModalPanel.classList.remove("translate-y-4", "scale-95");
          drModalPanel.classList.add("translate-y-0", "scale-100");
        }, 10);
      });
    });

    const hideDrModal = () => {
      drModal.classList.remove("opacity-100");
      drModalPanel.classList.add("translate-y-4", "scale-95");
      drModalPanel.classList.remove("translate-y-0", "scale-100");
      setTimeout(() => drModal.classList.add("hidden"), 300);
    };

    drCloseBtn?.addEventListener("click", hideDrModal);
    drBackdrop?.addEventListener("click", hideDrModal);
  }

});