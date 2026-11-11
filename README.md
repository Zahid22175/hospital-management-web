# 🏥 ClinicBook - Hospital Management System

A comprehensive, responsive web-based **Hospital Management System** designed to streamline healthcare services, patient appointments, and administrative workflows. Built using modern frontend technologies and cloud backend services.

## ✨ Live Demo
🌐 Check out the live website here: [ClinicBook Live](https://zahid22175.github.io/hospital-management-web/)

---

## 🚀 Features
* **Role-Based Dashboards:** Tailored interfaces and routing for Patients, Doctors, and Admin/Staff members.
* **Appointment Booking:** Seamless scheduling system allowing patients to book consultations effortlessly.
* **Responsive UI/UX:** Fully optimized layouts ensuring smooth performance across mobile, tablet, and desktop screens.
* **Secure Authentication:** Integrated user signup, login, and session management using Firebase Auth.
* **Real-time Database:** Dynamic data storage and retrieval powered by Firebase Firestore.

---

## 🛠️ Tech Stack
* **HTML5 / CSS3** (Structure & Styling)
* **Tailwind CSS** (Modern utility-first styling framework)
* **JavaScript (ES6+)** (Dynamic interactivity & logic modules)
* **Firebase** (Cloud Authentication & Database management)

---

## 📂 Project Structure

```text
hospital-management-web/
│
├── 📁 Admin/                      # Main Admin Control Panel
│   ├── 📁 appointment/            # Appointment management dashboard
│   ├── 📁 department/             # Hospital departments configuration
│   ├── 📁 doctor/                 # Doctors directory & status management
│   ├── 📁 messages/               # Contact & feedback messages center
│   ├── 📁 paitent/                # Patient records & logs management
│   ├── 📁 staff/                  # Staff directory & role management
│   ├── 📄 index.html              # Admin main view
│   └── ⚡ index.js                # Admin logic handler
│
├── 📁 About/                      # About Us page details
├── 📁 book-Appointment/           # Public appointment booking module
├── 📁 Contact/                    # ContactUs form module
├── 📁 Doctor/                     # Dedicated Doctor Portal
├── 📁 Patient/                    # Dedicated Patient Portal
├── 📁 Service/                    # Hospital services showcase
├── 📁 Staff/                      # Dedicated Staff Portal
├── 📁 login/                      # User authentication login module
├── 📁 signup/                     # User registration module
├── 📁 image/                      # Media assets, icons & graphics
│
├── 📄 index.html                  # Main website landing page
├── ⚡ index.js                    # Main router & app startup logic
├── 🔥 firebase.js                 # Firebase initialization & auth configuration
└── 🎨 style.css                   # Global styles & layout rules
