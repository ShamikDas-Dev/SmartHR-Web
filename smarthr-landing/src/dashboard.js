import { auth, db } from "./firebase/config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("No user is signed in.");

        window.location.href = "./../employee-login.html";
        return;
    }

    console.log("Employee authenticated:", user.email);

    try {
        const employeeRef = doc(db, "employees", user.uid);
        const employeeSnap = await getDoc(employeeRef);

        if (!employeeSnap.exists()) {
            console.error("Employee profile not found.");
            return;
        }

        const employee = employeeSnap.data();

        console.log("Employee data:", employee);

        loadEmployeeProfile(employee, user);

    } catch (error) {
        console.error("Failed to load employee profile:", error);
    }
});
let leaveSubmissionInProgress = false;
function loadEmployeeProfile(employee, user) {
    const personal = employee.personalInformation || {};
    const employment = employee.employmentInformation || {};
    const address = employee.address || {};
    const emergency = employee.emergencyContact || {};

    console.log("Loading employee profile...");

    // Personal Information
    setText("profileFullName", personal.fullName);
    setText("profileEmail", user.email);
    setText("profilePhone", personal.phoneNumber);
    setText("profileDob", personal.dateOfBirth);
    setText("profileGender", personal.gender);
    setText("profileBloodGroup", personal.bloodGroup);

    // Employment Information
    setText("profileEmployeeId", employee.employeeId);
    setText("profileDepartment", employment.department);
    setText("profileDesignation", employment.designation);
    setText("profileJoinDate", employment.joinDate);
    setText("profileEmploymentType", employment.employmentType);
    setText("profileWorkLocation", employment.workLocation);

    // Address
    setText("profileAddress1", address.addressLine1);
    setText("profileAddress2", address.addressLine2);
    setText("profileCity", address.city);
    setText("profileState", address.state);
    setText("profileCountry", address.country);
    setText("profilePostalCode", address.postalCode);

    // Emergency Contact
    setText("profileEmergencyName", emergency.contactName);
    setText("profileEmergencyRelation", emergency.relationship);
    setText("profileEmergencyPhone", emergency.phoneNumber);
    setText("profileEmergencyEmail", emergency.email);

    // Header
    setText("profileName", personal.fullName);

    const initial = personal.fullName
        ? personal.fullName.charAt(0).toUpperCase()
        : "E";

    setText("profileInitial", initial);
}
function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value || "-";
    }
}
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Close sidebar on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        }
    });
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            const activeTab = document.getElementById(tabId);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebarOverlay').classList.remove('active');
            }
        });
    });
}

function initCheckIn() {

    const headerCheckInBtn =
        document.getElementById("checkinBtn");

    const checkInBtn =
        document.getElementById("checkInBtn");

    const checkOutBtn =
        document.getElementById("checkOutBtn");


    // Header Check In button
    if (headerCheckInBtn) {

        headerCheckInBtn.addEventListener(
            "click",
            async () => {

                await handleAttendanceAction(
                    "check-in"
                );

            }
        );

    }


    // Attendance Check In button
    if (checkInBtn) {

        checkInBtn.addEventListener(
            "click",
            async () => {

                await handleAttendanceAction(
                    "check-in"
                );

            }
        );

    }


    // Attendance Check Out button
    if (checkOutBtn) {

        checkOutBtn.addEventListener(
            "click",
            async () => {

                await handleAttendanceAction(
                    "check-out"
                );

            }
        );

    }

}
async function handleAttendanceAction(action) {

    try {

        const user = auth.currentUser;

        if (!user) {

            showNotification(
                "Please login again."
            );

            return;
        }


        const checkInBtn =
            document.getElementById(
                "checkInBtn"
            );

        const checkOutBtn =
            document.getElementById(
                "checkOutBtn"
            );


        if (action === "check-in") {

            if (checkInBtn) {
                checkInBtn.disabled = true;
                checkInBtn.textContent =
                    "Checking in...";
            }

        } else {

            if (checkOutBtn) {
                checkOutBtn.disabled = true;
                checkOutBtn.textContent =
                    "Checking out...";
            }

        }


        const idToken =
            await user.getIdToken(true);


        const response =
            await fetch("/api/attendance", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body: JSON.stringify({
                    action
                })
            });


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Attendance action failed"
            );

        }


        showNotification(
            result.message
        );


        // Reload everything from Firestore
        await loadAttendance();


    } catch (error) {

        console.error(
            "Attendance action error:",
            error
        );

        showNotification(
            error.message ||
            "Attendance action failed"
        );


    } finally {

        await loadAttendance();

    }
}
async function loadAttendance() {

    try {

        const user =
            auth.currentUser;

        if (!user) {
            return;
        }


        const idToken =
            await user.getIdToken(true);


        const response =
            await fetch(
                "/api/attendance",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${idToken}`
                    }
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Failed to load attendance"
            );

        }


        console.log(
            "Attendance data:",
            result.attendance
        );

        window.__attendanceData =
            result.attendance || [];

        renderAttendance(
            window.__attendanceData
        );


    } catch (error) {

        console.error(
            "Load attendance error:",
            error
        );

        const container =
            document.getElementById(
                "attendanceRecords"
            );

        if (container) {

            container.innerHTML = `
                <div class="attendance-empty">
                    Unable to load attendance.
                </div>
            `;

        }

    }
}
function renderAttendance(attendance) {

    const container =
        document.getElementById(
            "attendanceRecords"
        );


    if (!container) {
        return;
    }


    // ==========================================
    // NO RECORDS
    // ==========================================

    if (
        !attendance ||
        attendance.length === 0
    ) {

        container.innerHTML = `
            <div class="attendance-empty">
                <p>No attendance records</p>
                <span>
                    Check in to start tracking your attendance.
                </span>
            </div>
        `;

        updateTodayAttendance(null);

        return;
    }


    // ==========================================
    // HISTORY
    // ==========================================

    container.innerHTML =
        attendance.map(record => {

            const workingHours =
                calculateWorkingHours(
                    record.checkIn,
                    record.checkOut
                );


            return `
                <div class="attendance-record">

                    <div class="attendance-date">
                        <strong>
                            ${formatAttendanceDate(
                record.date
            )}
                        </strong>

                        <span>
                            ${record.date}
                        </span>
                    </div>


                    <div class="attendance-record-item">
                        <span>Check In</span>

                        <strong>
                            ${record.checkIn || "--"}
                        </strong>
                    </div>


                    <div class="attendance-record-item">
                        <span>Check Out</span>

                        <strong>
                            ${record.checkOut || "--"}
                        </strong>
                    </div>


                    <div class="attendance-record-item">
                        <span>Working Hours</span>

                        <strong>
                            ${workingHours}
                        </strong>
                    </div>


                    <div>
                        <span
                            class="attendance-status-badge"
                        >
                            ${record.status || "Present"}
                        </span>
                    </div>

                </div>
            `;

        }).join("");


    // ==========================================
    // TODAY
    // ==========================================

    const today =
        getIndiaDate();


    const todayRecord =
        attendance.find(
            record =>
                record.date === today
        );


    updateTodayAttendance(
        todayRecord || null
    );
}
function updateTodayAttendance(record) {

    const status =
        document.getElementById(
            "attendanceStatus"
        );

    const checkIn =
        document.getElementById(
            "todayCheckIn"
        );

    const checkOut =
        document.getElementById(
            "todayCheckOut"
        );

    const workingHours =
        document.getElementById(
            "todayWorkingHours"
        );

    const checkInBtn =
        document.getElementById(
            "checkInBtn"
        );

    const checkOutBtn =
        document.getElementById(
            "checkOutBtn"
        );


    if (!record) {

        if (status) {
            status.textContent =
                "Not Checked In";
        }

        if (checkIn) {
            checkIn.textContent = "--";
        }

        if (checkOut) {
            checkOut.textContent = "--";
        }

        if (workingHours) {
            workingHours.textContent = "--";
        }

        if (checkInBtn) {
            checkInBtn.disabled = false;
            checkInBtn.textContent =
                "Check In";
        }

        if (checkOutBtn) {
            checkOutBtn.disabled = true;
            checkOutBtn.textContent =
                "Check Out";
        }

        return;
    }


    if (checkIn) {
        checkIn.textContent =
            record.checkIn || "--";
    }


    if (checkOut) {
        checkOut.textContent =
            record.checkOut || "--";
    }


    if (workingHours) {
        workingHours.textContent =
            calculateWorkingHours(
                record.checkIn,
                record.checkOut
            );
    }


    if (!record.checkOut) {

        if (status) {
            status.textContent =
                "Checked In";
        }

        if (checkInBtn) {
            checkInBtn.disabled = true;
            checkInBtn.textContent =
                "Checked In";
        }

        if (checkOutBtn) {
            checkOutBtn.disabled = false;
            checkOutBtn.textContent =
                "Check Out";
        }

    } else {

        if (status) {
            status.textContent =
                "Completed";
        }

        if (checkInBtn) {
            checkInBtn.disabled = true;
            checkInBtn.textContent =
                "Checked In";
        }

        if (checkOutBtn) {
            checkOutBtn.disabled = true;
            checkOutBtn.textContent =
                "Checked Out";
        }

    }
}
// ============================================================
// EMPLOYEE PAYROLL
// ============================================================

async function loadEmployeePayroll() {

    const container =
        document.querySelector("#payroll .empty-state");
    if (!container) {
        console.error("payrollContent not found.");
        return;
    }

    try {

        const user = auth.currentUser;

        if (!user) {
            console.error("No authenticated employee.");
            return;
        }

        container.innerHTML = `
            <div class="payroll-loading">
                Loading payroll information...
            </div>
        `;

        const token =
            await user.getIdToken(true);

        const response =
            await fetch("/api/payroll", {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            });

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to load payroll"
            );
        }

        const payroll =
            Array.isArray(data.payroll)
                ? data.payroll
                : [];
        window.__employeePayrollData =
            payroll;
        console.log(
            "Employee payroll:",
            payroll
        );

        renderEmployeePayroll(payroll);

    } catch (error) {

        console.error(
            "Load employee payroll error:",
            error
        );

        container.innerHTML = `
            <div class="payroll-empty">
                <h3>Unable to load payroll</h3>
                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;
    }
}
// ============================================================
// RENDER EMPLOYEE PAYROLL
// ============================================================

function renderEmployeePayroll(payroll) {
    const container =
        document.querySelector("#payroll .empty-state");

    if (!container) {
        return;
    }


    if (!payroll || payroll.length === 0) {

        container.innerHTML = `
            <div class="payroll-empty">
                <div class="payroll-empty-icon">
                    $
                </div>

                <h3>No payroll information</h3>

                <p>
                    Your salary details will appear here.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        payroll.map(record => {

            const basicSalary =
                Number(record.basicSalary || 0);

            const allowances =
                Number(record.allowances || 0);

            const deductions =
                Number(record.deductions || 0);

            const netSalary =
                Number(
                    record.netSalary ??
                    (
                        basicSalary +
                        allowances -
                        deductions
                    )
                );


            const month =
                record.month || "--";


            return `
                <div class="payroll-record-card">

                    <div class="payroll-record-header">

                        <div>
                            <h3>
                                Payroll
                            </h3>

                            <span>
                                ${escapeHtml(month)}
                            </span>
                        </div>

                        <div class="payroll-net-salary">
                            <span>Net Salary</span>

                            <strong>
                                ₹${netSalary.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}
                            </strong>
                        </div>

                    </div>


                    <div class="payroll-details">

                        <div class="payroll-detail">
                            <span>
                                Basic Salary
                            </span>

                            <strong>
                                ₹${basicSalary.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}
                            </strong>
                        </div>


                        <div class="payroll-detail">
                            <span>
                                Allowances
                            </span>

                            <strong>
                                ₹${allowances.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}
                            </strong>
                        </div>


                        <div class="payroll-detail">
                            <span>
                                Deductions
                            </span>

                            <strong>
                                ₹${deductions.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}
                            </strong>
                        </div>


                        <div class="payroll-detail">
                            <span>
                                Net Salary
                            </span>

                            <strong class="net-highlight">
                                ₹${netSalary.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}
                            </strong>
                        </div>

                    </div>

                </div>
            `;

        })
            .join("");
}
// ============================================================
// UPDATE OVERVIEW CARDS
// ============================================================

function updateOverviewCards(
    attendance = [],
    leaveRequests = [],
    payroll = []
) {

    // --------------------------------------------------------
    // PRESENT DAYS
    // --------------------------------------------------------

    const presentDaysElement =
        document.getElementById(
            "overviewPresentDays"
        );

    if (presentDaysElement) {

        const presentDays =
            attendance.filter(record =>
                record.status === "Present"
            ).length;

        presentDaysElement.textContent =
            presentDays;
    }


    // --------------------------------------------------------
    // LEAVE BALANCE
    // --------------------------------------------------------
    //
    // Current system does not have a configured leave
    // allowance/annual quota in Firestore yet.
    //
    // Therefore, show approved leave days rather than
    // inventing a remaining balance.
    // --------------------------------------------------------

    const leaveBalanceElement =
        document.getElementById(
            "overviewLeaveBalance"
        );

    if (leaveBalanceElement) {

        const approvedLeaveDays =
            leaveRequests
                .filter(request =>
                    request.status === "Approved"
                )
                .reduce(
                    (total, request) =>
                        total +
                        Number(
                            request.leaveDays ||
                            request.days ||
                            0
                        ),
                    0
                );

        leaveBalanceElement.textContent =
            approvedLeaveDays;
    }


    // --------------------------------------------------------
    // WORKING HOURS
    // --------------------------------------------------------

    const workingHoursElement =
        document.getElementById(
            "overviewWorkingHours"
        );

    if (workingHoursElement) {

        const today =
            getIndiaDate();

        const todayAttendance =
            attendance.find(
                record =>
                    record.date === today
            );


        if (
            todayAttendance &&
            todayAttendance.checkIn &&
            todayAttendance.checkOut
        ) {

            const hours =
                calculateWorkingHours(
                    todayAttendance.checkIn,
                    todayAttendance.checkOut
                );

            workingHoursElement.textContent =
                hours;

        } else {

            workingHoursElement.textContent =
                "0h";
        }
    }


    // --------------------------------------------------------
    // MONTHLY SALARY
    // --------------------------------------------------------

    const monthlySalaryElement =
        document.getElementById(
            "overviewMonthlySalary"
        );

    if (monthlySalaryElement) {

        if (
            Array.isArray(payroll) &&
            payroll.length > 0
        ) {

            const latestPayroll =
                [...payroll].sort(
                    (a, b) =>
                        (b.month || "")
                            .localeCompare(
                                a.month || ""
                            )
                )[0];


            const salary =
                Number(
                    latestPayroll.netSalary ??
                    (
                        Number(
                            latestPayroll.basicSalary || 0
                        ) +
                        Number(
                            latestPayroll.allowances || 0
                        ) -
                        Number(
                            latestPayroll.deductions || 0
                        )
                    )
                );


            monthlySalaryElement.textContent =
                `₹${salary.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )}`;

        } else {

            monthlySalaryElement.textContent =
                "₹0.00";
        }
    }
}
async function loadUserData() {
    try {
        // Make sure an employee is logged in
        const user = auth.currentUser;

        if (!user) {
            console.error("No authenticated employee found.");
            return;
        }

        // Get employee document using Firebase Auth UID
        const employeeRef = doc(db, "employees", user.uid);
        const employeeSnapshot = await getDoc(employeeRef);

        if (!employeeSnapshot.exists()) {
            console.error("Employee profile not found.");
            showNotification("Employee profile not found.");
            return;
        }

        const employee = employeeSnapshot.data();

        const personal = employee.personalInformation || {};
        const employment = employee.employmentInformation || {};
        const address = employee.address || {};
        const emergency = employee.emergencyContact || {};

        // ==========================================
        // Basic user information
        // ==========================================

        const fullName = personal.fullName || "Employee";
        const dashboardHeaderName =
            document.getElementById("dashboardHeaderName");

        const welcomeMessage =
            document.getElementById("welcomeMessage");

        if (dashboardHeaderName) {
            dashboardHeaderName.textContent = fullName;
        }

        if (welcomeMessage) {
            welcomeMessage.textContent =
                `Welcome, ${fullName}`;
        }
        const userName = document.getElementById("userName");
        const userRole = document.getElementById("userRole");
        const userAvatar = document.getElementById("userAvatar");


        if (userName) {
            userName.textContent = fullName;
        }

        if (userRole) {
            userRole.textContent = employment.designation || "Employee";
        }

        if (userAvatar) {
            userAvatar.textContent =
                fullName.charAt(0).toUpperCase();
        }
        const profileAvatarText =
            document.getElementById("profileAvatarText");

        if (profileAvatarText) {

            const initials =
                getUserInitials(fullName);

            profileAvatarText.textContent =
                initials;
        }

        // ============================================================
        // USER INITIALS
        // ============================================================

        function getUserInitials(name) {

            const cleanName =
                String(name || "")
                    .trim()
                    .replace(/\s+/g, " ");

            if (!cleanName) {
                return "E";
            }

            const parts =
                cleanName.split(" ");

            if (parts.length === 1) {
                return parts[0]
                    .substring(0, 2)
                    .toUpperCase();
            }

            return (
                parts[0].charAt(0) +
                parts[parts.length - 1].charAt(0)
            ).toUpperCase();
        }
        if (welcomeMessage) {
            welcomeMessage.textContent =
                `Welcome, ${fullName}`;
        }

        // ==========================================
        // Personal Information
        // ==========================================

        setProfileValue("fullName", fullName);
        setProfileValue("email", user.email || "");
        setProfileValue("phone", personal.phoneNumber);
        setProfileValue("dob", personal.dateOfBirth);
        setProfileValue("gender", personal.gender);
        setProfileValue("bloodGroup", personal.bloodGroup);


        // ==========================================
        // Employment Information
        // ==========================================

        setProfileValue("employeeId", employee.employeeId);
        setProfileValue("department", employment.department);
        setProfileValue("designation", employment.designation);
        setProfileValue("joinDate", employment.joinDate);
        setProfileValue("employmentType", employment.employmentType);
        setProfileValue("workLocation", employment.workLocation);


        // ==========================================
        // Address Information
        // ==========================================

        setProfileValue("address1", address.addressLine1);
        setProfileValue("address2", address.addressLine2);
        setProfileValue("city", address.city);
        setProfileValue("state", address.state);
        setProfileValue("country", address.country);
        setProfileValue("postalCode", address.postalCode);


        // ==========================================
        // Emergency Contact
        // ==========================================

        setProfileValue("emergencyName", emergency.contactName);
        setProfileValue("emergencyRelation", emergency.relationship);
        setProfileValue("emergencyPhone", emergency.phoneNumber);
        setProfileValue("emergencyEmail", emergency.email);
    } catch (error) {
        console.error("Failed to load user data:", error);
    }
}

function setProfileValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent =
            value !== undefined &&
                value !== null &&
                value !== ""
                ? value
                : "-";
    }
}

function initEditProfile() {
    const editBtn = document.getElementById("editProfileBtn");
    const modal = document.getElementById("editProfileModal");
    const closeBtn = document.getElementById("closeEditProfile");
    const cancelBtn = document.getElementById("cancelEditProfile");
    const form = document.getElementById("editProfileForm");

    if (!editBtn || !modal || !form) {
        console.error("Edit profile elements not found.");
        return;
    }

    // ==========================================
    // OPEN MODAL
    // ==========================================

    editBtn.addEventListener("click", async () => {

        const user = auth.currentUser;

        if (!user) {
            showNotification("You are not signed in.");
            return;
        }

        try {
            const employeeRef = doc(
                db,
                "employees",
                user.uid
            );

            const employeeSnap = await getDoc(employeeRef);

            if (!employeeSnap.exists()) {
                showNotification("Employee profile not found.");
                return;
            }

            const employee = employeeSnap.data();

            const personal =
                employee.personalInformation || {};

            const address =
                employee.address || {};

            const emergency =
                employee.emergencyContact || {};

            // Fill existing information into form

            document.getElementById("editPhone").value =
                personal.phoneNumber || "";

            document.getElementById("editAddress1").value =
                address.addressLine1 || "";

            document.getElementById("editAddress2").value =
                address.addressLine2 || "";

            document.getElementById("editCity").value =
                address.city || "";

            document.getElementById("editState").value =
                address.state || "";

            document.getElementById("editCountry").value =
                address.country || "";

            document.getElementById("editPostalCode").value =
                address.postalCode || "";

            document.getElementById("editEmergencyName").value =
                emergency.contactName || "";

            document.getElementById("editEmergencyRelation").value =
                emergency.relationship || "";

            document.getElementById("editEmergencyPhone").value =
                emergency.phoneNumber || "";

            document.getElementById("editEmergencyEmail").value =
                emergency.email || "";

            modal.classList.add("active");

        } catch (error) {

            console.error(
                "Failed to open edit profile:",
                error
            );

            showNotification(
                "Failed to load profile information."
            );
        }
    });


    // Make functions available to HTML onclick
    window.openLeaveModal = openLeaveModal;
    window.closeLeaveModal = closeLeaveModal;
    // ==========================================
    // CLOSE MODAL
    // ==========================================

    function closeModal() {
        modal.classList.remove("active");
    }

    closeBtn?.addEventListener(
        "click",
        closeModal
    );

    cancelBtn?.addEventListener(
        "click",
        closeModal
    );


    // Close when clicking outside modal

    modal.addEventListener("click", (event) => {

        if (event.target === modal) {
            closeModal();
        }

    });


    // ==========================================
    // SAVE PROFILE
    // ==========================================

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const user = auth.currentUser;

        if (!user) {
            showNotification("You are not signed in.");
            return;
        }

        const saveBtn =
            document.getElementById("saveProfileBtn");

        try {

            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            // Get Firebase authentication token

            const idToken =
                await user.getIdToken(true);


            // Send updated information to backend

            const response = await fetch(
                "/api/update-my-profile",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${idToken}`,
                    },

                    body: JSON.stringify({

                        phoneNumber:
                            document.getElementById(
                                "editPhone"
                            ).value.trim(),

                        addressLine1:
                            document.getElementById(
                                "editAddress1"
                            ).value.trim(),

                        addressLine2:
                            document.getElementById(
                                "editAddress2"
                            ).value.trim(),

                        city:
                            document.getElementById(
                                "editCity"
                            ).value.trim(),

                        state:
                            document.getElementById(
                                "editState"
                            ).value.trim(),

                        country:
                            document.getElementById(
                                "editCountry"
                            ).value.trim(),

                        postalCode:
                            document.getElementById(
                                "editPostalCode"
                            ).value.trim(),

                        contactName:
                            document.getElementById(
                                "editEmergencyName"
                            ).value.trim(),

                        relationship:
                            document.getElementById(
                                "editEmergencyRelation"
                            ).value.trim(),

                        emergencyPhoneNumber:
                            document.getElementById(
                                "editEmergencyPhone"
                            ).value.trim(),

                        emergencyEmail:
                            document.getElementById(
                                "editEmergencyEmail"
                            ).value.trim(),
                    }),
                }
            );


            const result =
                await response.json();


            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Failed to update profile"
                );
            }


            // Close modal

            closeModal();


            // Reload profile from Firestore

            await loadUserData();


            showNotification(
                "Profile updated successfully."
            );


        } catch (error) {

            console.error(
                "Update profile error:",
                error
            );

            showNotification(
                error.message ||
                "Failed to update profile."
            );

        } finally {

            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";

        }

    });
}
function navigateTo(tabId) {
    const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (navItem) {
        navItem.click();
    }
}
function getIndiaDate() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Kolkata"
        }
    ).format(new Date());

}
function formatAttendanceDate(dateString) {

    if (!dateString) {
        return "--";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}
function calculateWorkingHours(
    checkIn,
    checkOut
) {

    if (!checkIn || !checkOut) {
        return "--";
    }


    const parseTime = (timeString) => {

        const match =
            timeString.match(
                /(\d+):(\d+)\s*(AM|PM)/i
            );

        if (!match) {
            return null;
        }

        let hours =
            parseInt(match[1]);

        const minutes =
            parseInt(match[2]);

        const period =
            match[3].toUpperCase();


        if (
            period === "PM" &&
            hours !== 12
        ) {
            hours += 12;
        }


        if (
            period === "AM" &&
            hours === 12
        ) {
            hours = 0;
        }


        return (
            hours * 60 +
            minutes
        );

    };


    const start =
        parseTime(checkIn);

    const end =
        parseTime(checkOut);


    if (
        start === null ||
        end === null ||
        end < start
    ) {
        return "--";
    }


    const totalMinutes =
        end - start;


    const hours =
        Math.floor(
            totalMinutes / 60
        );

    const minutes =
        totalMinutes % 60;


    return `${hours}h ${minutes}m`;
}
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'toast-notification';
    notification.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Add styles dynamically
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem;
        padding: 1rem 1.5rem;
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 100;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Export functions for global use
window.navigateTo = navigateTo;
window.loadUserData = loadUserData;
// Add this to your dashboard.js file



// Add to DOMContentLoaded event
document.addEventListener("DOMContentLoaded", () => {

    initSidebar();
    initNavigation();
    initCheckIn();
    initEditProfile();
    initLeaveManagement();

    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            console.error(
                "No authenticated employee found."
            );

            return;
        }

        console.log(
            "Employee authenticated:",
            user.email
        );

        await loadUserData();
        await loadAttendance();
        await loadLeaveRequests();
        await loadEmployeePayroll();
        updateOverviewCards(
            window.__attendanceData || [],
            window.__leaveRequestsData || [],
            window.__employeePayrollData || []
        );
    });

});



// ============================================================
// LEAVE MANAGEMENT BUTTONS
// ============================================================

function initLeaveManagement() {

    const applyLeaveBtn =
        document.getElementById("applyLeaveBtn");

    const applyLeaveEmptyBtn =
        document.getElementById("applyLeaveEmptyBtn");

    const submitLeaveBtn =
        document.getElementById("submitLeaveBtn");

    const closeLeaveBtn =
        document.getElementById("closeLeaveBtn");

    const cancelLeaveBtn =
        document.getElementById("cancelLeaveBtn");


    // Apply for Leave buttons
    applyLeaveBtn?.addEventListener("click", () => {
        openLeaveModal();
    });

    applyLeaveEmptyBtn?.addEventListener("click", () => {
        openLeaveModal();
    });


    // Submit leave request
    submitLeaveBtn?.addEventListener("click", async (event) => {

        event.preventDefault();

        await submitLeaveRequest();

    });


    // Close buttons
    closeLeaveBtn?.addEventListener("click", () => {
        closeLeaveModal();
    });

    cancelLeaveBtn?.addEventListener("click", () => {
        closeLeaveModal();
    });


    // Close modal when clicking outside
    const modal =
        document.getElementById("leaveModal");

    modal?.addEventListener("click", (event) => {

        if (event.target === modal) {
            closeLeaveModal();
        }

    });
}
// ============================================================
// LEAVE MANAGEMENT - FINAL HANDLERS
// ============================================================

function openLeaveModal() {
    const modal = document.getElementById("leaveModal");

    if (!modal) {
        console.error("leaveModal element not found");
        return;
    }

    modal.classList.add("active");
}

function closeLeaveModal() {
    const modal = document.getElementById("leaveModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    const form = document.getElementById("leaveForm");

    if (form) {
        form.reset();
    }
}

async function submitLeaveRequest() {

    // Prevent double submission
    if (leaveSubmissionInProgress) {
        console.log("Leave submission already in progress.");
        return;
    }

    const leaveType =
        document.getElementById("leaveType")?.value;

    const startDate =
        document.getElementById("leaveStartDate")?.value;

    const endDate =
        document.getElementById("leaveEndDate")?.value;

    const reason =
        document.getElementById("leaveReason")?.value.trim();


    // ==============================
    // VALIDATION
    // ==============================

    if (!leaveType) {
        showNotification("Please select a leave type.");
        return;
    }

    if (!startDate) {
        showNotification("Please select a start date.");
        return;
    }

    if (!endDate) {
        showNotification("Please select an end date.");
        return;
    }

    if (!reason) {
        showNotification("Please enter a reason.");
        return;
    }

    if (endDate < startDate) {
        showNotification(
            "End date cannot be before start date."
        );
        return;
    }


    // ==============================
    // AUTHENTICATION
    // ==============================

    const user = auth.currentUser;

    if (!user) {
        showNotification("You are not signed in.");
        return;
    }


    // ==============================
    // LOCK SUBMISSION
    // ==============================

    leaveSubmissionInProgress = true;

    const submitButton =
        document.getElementById("submitLeaveBtn");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
    }


    try {

        showNotification(
            "Submitting leave request..."
        );


        const token =
            await user.getIdToken(true);


        const response =
            await fetch(
                "/api/leave",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        leaveType,
                        startDate,
                        endDate,
                        reason
                    })
                }
            );


        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }


        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to submit leave request."
            );
        }


        // ==============================
        // SUCCESS
        // ==============================

        closeLeaveModal();

        showNotification(
            data.message ||
            "Leave request submitted successfully."
        );


        // Reload leave requests
        if (
            typeof loadLeaveRequests ===
            "function"
        ) {
            await loadLeaveRequests();
        }


    } catch (error) {

        console.error(
            "Submit leave request error:",
            error
        );

        showNotification(
            error.message ||
            "Failed to submit leave request."
        );


    } finally {

        // Unlock submission
        leaveSubmissionInProgress = false;

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                "Submit Request";
        }
    }
}
// ============================================================
// LOAD MY LEAVE REQUESTS
// ============================================================

async function loadLeaveRequests() {
    const container =
        document.getElementById("leaveRequestList");

    if (!container) {
        console.error("leaveRequestList not found.");
        return;
    }

    try {
        const user = auth.currentUser;

        if (!user) {
            console.error("Employee is not signed in.");
            return;
        }

        const token = await user.getIdToken(true);

        const response = await fetch(
            "/api/leave",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to load leave requests."
            );
        }

        const requests =
            Array.isArray(data.requests)
                ? data.requests
                : [];
        console.log(
            "Leave requests loaded:",
            requests
        );

        window.__leaveRequestsData =
            requests;

        updateLeaveCounts(requests);
        renderLeaveRequests(requests);

    } catch (error) {

        console.error(
            "Load leave requests error:",
            error
        );

        container.innerHTML = `
            <div class="leave-empty-state">
                <div class="leave-empty-icon">
                    <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                        ></circle>

                        <line
                            x1="12"
                            y1="8"
                            x2="12"
                            y2="12"
                        ></line>

                        <line
                            x1="12"
                            y1="16"
                            x2="12.01"
                            y2="16"
                        ></line>
                    </svg>
                </div>

                <h4>Unable to load requests</h4>

                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;
    }
}


// ============================================================
// RENDER MY LEAVE REQUESTS
// ============================================================

function renderLeaveRequests(requests) {

    const container =
        document.getElementById("leaveRequestList");

    if (!container) {
        console.error("leaveRequestList not found.");
        return;
    }


    // --------------------------------------------------------
    // NO REQUESTS
    // --------------------------------------------------------

    if (!requests || requests.length === 0) {

        container.innerHTML = `
            <div class="leave-empty-state">

                <div class="leave-empty-icon">
                    <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <rect
                            x="3"
                            y="4"
                            width="18"
                            height="17"
                            rx="2"
                        ></rect>

                        <line
                            x1="16"
                            y1="2"
                            x2="16"
                            y2="6"
                        ></line>

                        <line
                            x1="8"
                            y1="2"
                            x2="8"
                            y2="6"
                        ></line>

                        <line
                            x1="3"
                            y1="10"
                            x2="21"
                            y2="10"
                        ></line>
                    </svg>
                </div>

                <h4>No leave requests yet</h4>

                <p>
                    Submit your first leave request to see it here.
                </p>

                <button
                    type="button"
                    class="leave-empty-btn"
                    id="emptyApplyLeaveBtn"
                >
                    Apply for Leave
                </button>

            </div>
        `;

        const emptyButton =
            document.getElementById(
                "emptyApplyLeaveBtn"
            );

        if (emptyButton) {
            emptyButton.addEventListener(
                "click",
                openLeaveModal
            );
        }

        return;
    }


    // --------------------------------------------------------
    // REQUEST CARDS
    // --------------------------------------------------------

    container.innerHTML =
        requests.map(request => {

            const status =
                request.status || "Pending";

            let statusClass =
                "leave-status-pending";

            if (status === "Approved") {
                statusClass =
                    "leave-status-approved";
            }

            if (status === "Rejected") {
                statusClass =
                    "leave-status-rejected";
            }


            const leaveType =
                request.leaveType || "Leave";

            const startDate =
                request.startDate || "--";

            const endDate =
                request.endDate || "--";

            const leaveDays =
                request.leaveDays ||
                request.days ||
                1;

            const reason =
                request.reason || "No reason provided";


            let submittedDate = "--";

            if (request.createdAt) {

                const date =
                    new Date(request.createdAt);

                if (!Number.isNaN(date.getTime())) {

                    submittedDate =
                        date.toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        );
                }
            }


            return `
                <div class="leave-request-card">

                    <div class="leave-request-top">

                        <div class="leave-request-type">

                            <div class="leave-request-icon">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.7"
                                >
                                    <rect
                                        x="3"
                                        y="4"
                                        width="18"
                                        height="17"
                                        rx="2"
                                    ></rect>

                                    <line
                                        x1="16"
                                        y1="2"
                                        x2="16"
                                        y2="6"
                                    ></line>

                                    <line
                                        x1="8"
                                        y1="2"
                                        x2="8"
                                        y2="6"
                                    ></line>

                                    <line
                                        x1="3"
                                        y1="10"
                                        x2="21"
                                        y2="10"
                                    ></line>
                                </svg>
                            </div>

                            <div>
                                <h4>
                                    ${escapeHtml(leaveType)}
                                </h4>

                                <span>
                                    Submitted ${submittedDate}
                                </span>
                            </div>

                        </div>


                        <span
                            class="leave-status-badge ${statusClass}"
                        >
                            ${escapeHtml(status)}
                        </span>

                    </div>


                    <div class="leave-request-details">

                        <div class="leave-detail">

                            <span class="leave-detail-label">
                                Date
                            </span>

                            <strong>
                                ${escapeHtml(startDate)}
                                <span class="date-separator">
                                    →
                                </span>
                                ${escapeHtml(endDate)}
                            </strong>

                        </div>


                        <div class="leave-detail">

                            <span class="leave-detail-label">
                                Duration
                            </span>

                            <strong>
                                ${escapeHtml(String(leaveDays))}
                                ${leaveDays == 1 ? "Day" : "Days"}
                            </strong>

                        </div>

                    </div>


                    <div class="leave-request-reason">

                        <span class="leave-detail-label">
                            Reason
                        </span>

                        <p>
                            ${escapeHtml(reason)}
                        </p>

                    </div>


                    ${request.hrComment
                    ? `
                                <div class="leave-request-comment">

                                    <span class="leave-detail-label">
                                        HR Comment
                                    </span>

                                    <p>
                                        ${escapeHtml(
                        request.hrComment
                    )}
                                    </p>

                                </div>
                            `
                    : ""
                }

                </div>
            `;

        }).join("");
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// Make available globally
window.loadLeaveRequests =
    loadLeaveRequests;

window.renderLeaveRequests =
    renderLeaveRequests;

// ============================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ============================================================

window.openLeaveModal =
    openLeaveModal;

window.closeLeaveModal =
    closeLeaveModal;

window.submitLeaveRequest =
    submitLeaveRequest;


// ============================================================
// START LEAVE MANAGEMENT
// ============================================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initLeaveManagement
    );

} else {

    initLeaveManagement();

}


// ============================================================
// UPDATE LEAVE COUNTS
// ============================================================

function updateLeaveCounts(requests) {

    const total = requests.length;

    const pending = requests.filter(
        request => request.status === "Pending"
    ).length;

    const approved = requests.filter(
        request => request.status === "Approved"
    ).length;

    const rejected = requests.filter(
        request => request.status === "Rejected"
    ).length;


    const totalElement =
        document.getElementById("leaveTotalCount");

    const pendingElement =
        document.getElementById("leavePendingCount");

    const approvedElement =
        document.getElementById("leaveApprovedCount");

    const rejectedElement =
        document.getElementById("leaveRejectedCount");


    if (totalElement) {
        totalElement.textContent = total;
    }

    if (pendingElement) {
        pendingElement.textContent = pending;
    }

    if (approvedElement) {
        approvedElement.textContent = approved;
    }

    if (rejectedElement) {
        rejectedElement.textContent = rejected;
    }
}




// Make available globally
window.loadLeaveRequests = loadLeaveRequests;
window.updateLeaveCounts = updateLeaveCounts;
window.renderLeaveRequests = renderLeaveRequests;