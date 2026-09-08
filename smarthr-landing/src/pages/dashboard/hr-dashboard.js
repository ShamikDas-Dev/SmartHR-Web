
import { auth } from "../../firebase/config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
// HR Dashboard JavaScript

let employees = [];
let payrollRecords = [];
let deleteEmployeeId = null;
let resetPasswordEmployeeId = null;
let currentHRUser = null;
let leaveRequests = [];

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("HR Dashboard JS loaded");

    // Initialize UI first
    initSidebar();
    initNavigation();
    initEmployeeSearch();
    initPayrollCalculation();



    // Firebase authentication
    onAuthStateChanged(auth, async (user) => {

        console.log(
            "HR auth state:",
            user ? user.email : "NO USER"
        );

        if (!user) {
            currentHRUser = null;

            console.error("HR user is not signed in.");
            showNotification("You are not signed in.");
            return;
        }

        currentHRUser = user;

        try {

            const tokenResult =
                await user.getIdTokenResult(true);

            const role =
                tokenResult.claims.role;

            console.log("HR role:", role);

            if (role !== "hr" && role !== "admin") {

                showNotification(
                    "You do not have HR access."
                );

                return;
            }

            console.log("HR authentication successful");

            // Load employees
            await loadEmployees();

            // Load attendance
            await loadHRAttendance();

            // Load leave requests
            if (typeof loadHRLeaveRequests === "function") {
                await loadHRLeaveRequests();
            }
            await loadPayroll();
            console.log(
                "HR dashboard data loaded successfully"
            );

        } catch (error) {

            console.error(
                "HR dashboard initialization error:",
                error
            );

            showNotification(
                error.message ||
                "Failed to load HR dashboard"
            );
        }

    });

});

// ============================================================
// SIDEBAR
// ============================================================

function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarClose = document.getElementById("sidebarClose");

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.add("open");
            sidebarOverlay.classList.add("active");
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("active");
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("active");
        });
    }

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("active");
        }
    });
}


// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
    const navItems =
        document.querySelectorAll(".nav-item[data-tab]");

    const tabContents =
        document.querySelectorAll(".tab-content");

    navItems.forEach(item => {
        item.addEventListener("click", () => {

            const tabId =
                item.getAttribute("data-tab");

            navItems.forEach(nav =>
                nav.classList.remove("active")
            );

            item.classList.add("active");

            tabContents.forEach(content =>
                content.classList.remove("active")
            );

            const activeTab =
                document.getElementById(tabId);

            if (activeTab) {
                activeTab.classList.add("active");
            }

            // Load attendance from Firebase
            if (tabId === "attendance") {
                if (currentHRUser) {
                    loadHRAttendance();
                } else {
                    showNotification(
                        "HR authentication is still loading."
                    );
                }
            }

            if (window.innerWidth <= 768) {
                document
                    .getElementById("sidebar")
                    .classList.remove("open");

                document
                    .getElementById("sidebarOverlay")
                    .classList.remove("active");
            }
        });
    });
}
// ============================================================
// HR ATTENDANCE
// ============================================================

async function loadHRAttendance() {
    try {
        const container =
            document.getElementById(
                "hrAttendanceRecords"
            );

        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Loading attendance...</p>
                </div>
            `;
        }

        const data = await apiRequest(
            "/api/attendance",
            {
                method: "GET"
            }
        );

        renderHRAttendanceStats(
            data.stats
        );

        renderHRAttendanceTable(
            data.attendance
        );

    } catch (error) {

        console.error(
            "HR attendance error:",
            error
        );

        showNotification(
            error.message ||
            "Failed to load attendance"
        );
    }
}
function renderHRAttendanceStats(stats) {

    const totalEmployees =
        document.getElementById(
            "attendanceTotalEmployees"
        );

    const presentToday =
        document.getElementById(
            "attendancePresentToday"
        );

    const checkedOut =
        document.getElementById(
            "attendanceCheckedOut"
        );

    const notCheckedIn =
        document.getElementById(
            "attendanceNotCheckedIn"
        );


    if (totalEmployees) {
        totalEmployees.textContent =
            stats?.totalEmployees ?? 0;
    }


    if (presentToday) {
        presentToday.textContent =
            stats?.presentToday ?? 0;
    }


    if (checkedOut) {
        checkedOut.textContent =
            stats?.checkedOut ?? 0;
    }


    if (notCheckedIn) {
        notCheckedIn.textContent =
            stats?.notCheckedIn ?? 0;
    }
}
function renderHRAttendanceTable(attendance) {

    const container =
        document.getElementById(
            "hrAttendanceRecords"
        );

    if (!container) {
        return;
    }


    if (
        !attendance ||
        attendance.length === 0
    ) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No employees found</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        attendance.map(employee => {

            let statusClass =
                "status-not-checked";

            if (
                employee.status ===
                "Present"
            ) {
                statusClass =
                    "status-present";
            }

            if (
                employee.status ===
                "Checked Out"
            ) {
                statusClass =
                    "status-checked-out";
            }


            return `
                <div class="hr-attendance-row">

                    <div class="attendance-employee">

                        <strong>
                            ${escapeHTML(
                employee.name
            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                employee.department
            )}
                        </span>

                    </div>


                    <div>
                        ${escapeHTML(
                employee.employeeId
            )}
                    </div>


                    <div>
                        ${employee.checkIn ||
                "--"
                }
                    </div>


                    <div>
                        ${employee.checkOut ||
                "--"
                }
                    </div>


                    <div>

                        <span
                            class="attendance-status-badge ${statusClass}"
                        >
                            ${escapeHTML(
                    employee.status
                )}
                        </span>

                    </div>

                </div>
            `;

        }).join("");
}

// ============================================================
// HR LEAVE REQUESTS
// ============================================================

async function loadHRLeaveRequests() {
    try {
        const data = await apiRequest(
            "/api/hr-leave",
            {
                method: "GET"
            }
        );

        leaveRequests = Array.isArray(data.requests)
            ? data.requests
            : [];

        console.log(
            "HR leave requests loaded:",
            leaveRequests
        );

        renderHRLeaveRequests();

    } catch (error) {

        console.error(
            "Error loading HR leave requests:",
            error
        );

        leaveRequests = [];

        renderHRLeaveRequests();

        showNotification(
            error.message ||
            "Failed to load leave requests"
        );
    }
}

function refreshLeaveRequests() {
    loadHRLeaveRequests();
}
// ============================================================
// RENDER LEAVE REQUESTS
// ============================================================

function renderHRLeaveRequests() {

    const tableBody =
        document.getElementById(
            "leaveRequestsTableBody"
        );

    if (!tableBody) {
        console.error(
            "leaveRequestsTableBody not found"
        );
        return;
    }

    // --------------------------------------------------------
    // UPDATE STATISTICS
    // --------------------------------------------------------

    const total =
        leaveRequests.length;

    const pending =
        leaveRequests.filter(
            request =>
                request.status === "Pending"
        ).length;

    const approved =
        leaveRequests.filter(
            request =>
                request.status === "Approved"
        ).length;

    const rejected =
        leaveRequests.filter(
            request =>
                request.status === "Rejected"
        ).length;


    const totalElement =
        document.getElementById(
            "hrLeaveTotalCount"
        );

    const pendingElement =
        document.getElementById(
            "hrLeavePendingCount"
        );

    const approvedElement =
        document.getElementById(
            "hrLeaveApprovedCount"
        );

    const rejectedElement =
        document.getElementById(
            "hrLeaveRejectedCount"
        );


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


    // --------------------------------------------------------
    // EMPTY STATE
    // --------------------------------------------------------

    if (leaveRequests.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:50px;
                        color:#888;
                    "
                >
                    No leave requests found.
                </td>
            </tr>
        `;

        return;
    }


    // --------------------------------------------------------
    // TABLE
    // --------------------------------------------------------

    tableBody.innerHTML =
        leaveRequests
            .map(request => {

                const employee =
                    employees.find(
                        emp =>
                            emp.id ===
                            request.employeeId
                    );

                const employeeName =
                    employee?.name ||
                    request.employeeName ||
                    "Employee";

                const employeeId =
                    employee?.employeeId ||
                    request.employeeId ||
                    "--";

                const leaveType =
                    request.leaveType ||
                    "--";

                const startDate =
                    request.startDate ||
                    "--";

                const endDate =
                    request.endDate ||
                    "--";

                const days =
                    request.leaveDays ||
                    request.days ||
                    "--";

                const reason =
                    request.reason ||
                    "--";

                const status =
                    request.status ||
                    "Pending";


                let statusClass =
                    "status-pending";

                if (status === "Approved") {
                    statusClass =
                        "status-approved";
                }

                if (status === "Rejected") {
                    statusClass =
                        "status-rejected";
                }


                let actions = "";

                if (status === "Pending") {

                    actions = `
                        <button
                            type="button"
                            class="leave-action-btn approve-leave-btn"
                            data-id="${escapeHTML(request.id)}"
                        >
                            Approve
                        </button>

                        <button
                            type="button"
                            class="leave-action-btn reject-leave-btn"
                            data-id="${escapeHTML(request.id)}"
                        >
                            Reject
                        </button>
                    `;

                } else {

                    actions = `
                        <span
                            style="
                                color:#888;
                                font-size:13px;
                            "
                        >
                            Reviewed
                        </span>
                    `;
                }


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(employeeName)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(employeeId)}
                        </td>

                        <td>
                            ${escapeHTML(leaveType)}
                        </td>

                        <td>
                            ${escapeHTML(startDate)}
                            -
                            ${escapeHTML(endDate)}
                        </td>

                        <td>
                            ${escapeHTML(String(days))}
                        </td>

                        <td>
                            ${escapeHTML(reason)}
                        </td>

                        <td>
                            <span
                                class="${statusClass}"
                            >
                                ${escapeHTML(status)}
                            </span>
                        </td>

                        <td>
                            <div
                                style="
                                    display:flex;
                                    gap:8px;
                                "
                            >
                                ${actions}
                            </div>
                        </td>

                    </tr>
                `;
            })
            .join("");


    // --------------------------------------------------------
    // APPROVE BUTTONS
    // --------------------------------------------------------

    document
        .querySelectorAll(".approve-leave-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const requestId =
                        button.dataset.id;

                    updateLeaveRequest(
                        requestId,
                        "approve"
                    );
                }
            );
        });


    // --------------------------------------------------------
    // REJECT BUTTONS
    // --------------------------------------------------------

    document
        .querySelectorAll(".reject-leave-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const requestId =
                        button.dataset.id;

                    updateLeaveRequest(
                        requestId,
                        "reject"
                    );
                }
            );
        });
}


// ============================================================
// APPROVE / REJECT LEAVE
// ============================================================

async function updateLeaveRequest(
    requestId,
    action
) {

    if (!requestId) {
        showNotification(
            "Leave request ID is missing"
        );
        return;
    }


    const actionText =
        action === "approve"
            ? "approve"
            : "reject";


    const confirmed =
        window.confirm(
            `Are you sure you want to ${actionText} this leave request?`
        );


    if (!confirmed) {
        return;
    }


    try {

        showNotification(
            action === "approve"
                ? "Approving leave request..."
                : "Rejecting leave request..."
        );


        const data =
            await apiRequest(
                "/api/hr-leave",
                {
                    method: "POST",

                    body: JSON.stringify({
                        requestId,
                        action
                    })
                }
            );


        showNotification(
            data.message ||
            (
                action === "approve"
                    ? "Leave approved successfully"
                    : "Leave rejected successfully"
            )
        );


        // Reload from Firebase
        await loadHRLeaveRequests();


    } catch (error) {

        console.error(
            "Leave update error:",
            error
        );

        showNotification(
            error.message ||
            "Failed to update leave request"
        );
    }
}
// ============================================================
// EMPLOYEE SEARCH
// ============================================================

function initEmployeeSearch() {
    const searchInput = document.getElementById("employeeSearch");

    if (searchInput) {
        searchInput.addEventListener("input", event => {
            const searchTerm = event.target.value.toLowerCase();
            filterEmployees(searchTerm);
        });
    }
}


function filterEmployees(searchTerm) {
    const tableBody = document.getElementById("employeesTableBody");
    const emptyState = document.getElementById("employeesEmptyState");

    if (!tableBody) return;

    const filteredEmployees = employees.filter(emp =>
        (emp.name && emp.name.toLowerCase().includes(searchTerm)) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm)) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm)) ||
        (emp.designation && emp.designation.toLowerCase().includes(searchTerm)) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(searchTerm))
    );

    if (filteredEmployees.length === 0) {
        tableBody.innerHTML = "";

        if (emptyState) {
            emptyState.style.display = "flex";

            const emptyTitle = emptyState.querySelector("p");
            const emptySubtitle = emptyState.querySelector("span");

            if (emptyTitle) {
                emptyTitle.textContent = "No employees found";
            }

            if (emptySubtitle) {
                emptySubtitle.textContent = "Try adjusting your search";
            }
        }

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    tableBody.innerHTML = filteredEmployees
        .map(emp => createEmployeeRow(emp))
        .join("");
}


// ============================================================
// FIREBASE API HELPER
// ============================================================

async function getHRIdToken() {
    const user = currentHRUser;

    if (!user) {
        throw new Error("HR authentication is still loading.");
    }

    return await user.getIdToken();
}


async function apiRequest(url, options = {}) {
    const token = await getHRIdToken();

    const response = await fetch(url, {
        ...options,

        headers: {
            "Content-Type": "application/json",

            "Authorization": `Bearer ${token}`,

            ...(options.headers || {})
        }
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Request failed."
        );
    }

    return data;
}


// ============================================================
// LOAD EMPLOYEES FROM FIREBASE
// ============================================================

async function loadEmployees() {
    try {
        const data = await apiRequest("/api/employees", {
            method: "GET"
        });

        employees = Array.isArray(data.employees)
            ? data.employees
            : [];

        renderEmployees();
        populatePayrollEmployeeSelect();

    } catch (error) {
        console.error("Error loading employees:", error);

        employees = [];

        renderEmployees();
        populatePayrollEmployeeSelect();

        showNotification(
            error.message || "Failed to load employees"
        );
    }
}

// ============================================================
// EMPLOYEE TABLE
// ============================================================

function renderEmployees() {
    const tableBody = document.getElementById("employeesTableBody");
    const emptyState = document.getElementById("employeesEmptyState");

    if (!tableBody) return;

    if (employees.length === 0) {
        tableBody.innerHTML = "";

        if (emptyState) {
            emptyState.style.display = "flex";

            const emptyTitle = emptyState.querySelector("p");
            const emptySubtitle = emptyState.querySelector("span");

            if (emptyTitle) {
                emptyTitle.textContent = "No employees yet";
            }

            if (emptySubtitle) {
                emptySubtitle.textContent =
                    "Add your first employee to get started";
            }
        }

        updateStats();

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    tableBody.innerHTML = employees
        .map(emp => createEmployeeRow(emp))
        .join("");

    updateStats();
}


function createEmployeeRow(emp) {
    return `
        <tr>

            <td>

                <div class="employee-cell">

                    <div class="employee-cell-avatar">
                        ${getInitials(emp.name)}
                    </div>

                    <div class="employee-cell-info">

                        <span class="employee-cell-name">
                            ${escapeHtml(emp.name || "--")}
                        </span>

                        <span class="employee-cell-email">
                            ${escapeHtml(emp.email || "--")}
                        </span>

                    </div>

                </div>

            </td>


            <td>
                ${escapeHtml(emp.department || "--")}
            </td>


            <td>
                ${escapeHtml(emp.designation || "--")}
            </td>


            <td>
                <span class="status-badge">
                    ${escapeHtml(emp.status || "Active")}
                </span>
            </td>


            <td>

                <div class="action-buttons">

                    <button
                        class="action-btn"
                        onclick="openEditEmployeeModal('${escapeJs(emp.id)}')"
                        aria-label="Edit employee"
                        title="Edit"
                    >

                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >

                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>

                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>

                        </svg>

                    </button>


                    <button
                        class="action-btn reset"
                        onclick="openResetPasswordModal('${escapeJs(emp.id)}')"
                        aria-label="Reset password"
                        title="Reset Password"
                    >

                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >

                            <rect
                                x="3"
                                y="11"
                                width="18"
                                height="11"
                                rx="2"
                                ry="2"
                            ></rect>

                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>

                        </svg>

                    </button>


                    <button
                        class="action-btn delete"
                        onclick="openDeleteEmployeeModal('${escapeJs(emp.id)}')"
                        aria-label="Delete employee"
                        title="Delete"
                    >

                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >

                            <polyline points="3 6 5 6 21 6"></polyline>

                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>

                            <line
                                x1="10"
                                y1="11"
                                x2="10"
                                y2="17"
                            ></line>

                            <line
                                x1="14"
                                y1="11"
                                x2="14"
                                y2="17"
                            ></line>

                        </svg>

                    </button>

                </div>

            </td>

        </tr>
    `;
}


// ============================================================
// SECURITY / HTML ESCAPING
// ============================================================

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function escapeHtml(value) {
    return escapeHTML(value);
}
function escapeJs(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ============================================================
// EMPLOYEE ID
// ============================================================

function generateEmployeeId() {
    const empIdInput = document.getElementById("empId");

    if (!empIdInput) return;

    const year = new Date().getFullYear();

    let highestNumber = 0;

    employees.forEach(employee => {
        const employeeId = employee.employeeId;

        if (!employeeId) return;

        const match = employeeId.match(
            new RegExp(`^EMP-${year}-(\\d+)$`)
        );

        if (match) {
            const number = parseInt(match[1], 10);

            if (number > highestNumber) {
                highestNumber = number;
            }
        }
    });

    const nextNumber = highestNumber + 1;

    empIdInput.value =
        `EMP-${year}-${String(nextNumber).padStart(3, "0")}`;
}


// ============================================================
// ADD EMPLOYEE MODAL
// ============================================================

function openAddEmployeeModal() {
    generateEmployeeId();

    document
        .getElementById("addEmployeeModal")
        .classList
        .add("active");
}


function closeAddEmployeeModal() {
    document
        .getElementById("addEmployeeModal")
        .classList
        .remove("active");

    document
        .getElementById("addEmployeeForm")
        .reset();
}


// ============================================================
// ADD EMPLOYEE
// ============================================================

async function addEmployee() {

    const name =
        document.getElementById("empName").value.trim();

    const email =
        document.getElementById("empEmail").value.trim();

    const password =
        document.getElementById("empPassword").value;


    if (!name || !email || !password) {

        showNotification(
            "Please fill in all required fields"
        );

        return;
    }


    if (password.length < 6) {

        showNotification(
            "Password must be at least 6 characters"
        );

        return;
    }


    if (
        employees.some(
            emp =>
                emp.email &&
                emp.email.toLowerCase() ===
                email.toLowerCase()
        )
    ) {

        showNotification(
            "An employee with this email already exists"
        );

        return;
    }


    const employeeData = {

        email: email,

        password: password,

        fullName: name,


        // Personal information

        phoneNumber:
            document.getElementById("empPhone").value,

        dateOfBirth:
            document.getElementById("empDob").value,

        gender:
            document.getElementById("empGender").value,

        bloodGroup:
            document.getElementById("empBloodGroup").value,


        // Employment information

        employeeId:
            document.getElementById("empId").value,

        department:
            document.getElementById("empDepartment").value,

        designation:
            document.getElementById("empDesignation").value,

        joinDate:
            document.getElementById("empJoinDate").value,

        employmentType:
            document.getElementById("empType").value,

        workLocation:
            document.getElementById("empLocation").value,


        // Address

        addressLine1:
            document.getElementById("empAddress1").value,

        addressLine2:
            document.getElementById("empAddress2").value,

        city:
            document.getElementById("empCity").value,

        state:
            document.getElementById("empState").value,

        country:
            document.getElementById("empCountry").value,

        postalCode:
            document.getElementById("empPostal").value,


        // Emergency contact

        contactName:
            document.getElementById("empEmergencyName").value,

        relationship:
            document.getElementById("empEmergencyRelation").value,

        emergencyPhoneNumber:
            document.getElementById("empEmergencyPhone").value,

        emergencyEmail:
            document.getElementById("empEmergencyEmail").value
    };


    try {

        showNotification("Creating employee...");


        const data =
            await apiRequest(
                "/api/create-employee",
                {
                    method: "POST",

                    body:
                        JSON.stringify(employeeData)
                }
            );


        closeAddEmployeeModal();


        showNotification(
            data.message ||
            "Employee added successfully"
        );


        await loadEmployees();


    } catch (error) {

        console.error(
            "Add employee error:",
            error
        );


        showNotification(
            error.message ||
            "Failed to add employee"
        );
    }
}


// ============================================================
// EDIT EMPLOYEE
// ============================================================

function openEditEmployeeModal(id) {

    const employee =
        employees.find(
            emp => emp.id === id
        );


    if (!employee) {

        showNotification(
            "Employee not found"
        );

        return;
    }


    document.getElementById("editEmpId").value =
        employee.id;


    document.getElementById("editEmpName").value =
        employee.name || "";


    document.getElementById("editEmpEmail").value =
        employee.email || "";


    document.getElementById("editEmpPhone").value =
        employee.phone || "";


    document.getElementById("editEmpDob").value =
        employee.dob || "";


    document.getElementById("editEmpGender").value =
        employee.gender || "";


    document.getElementById("editEmpBloodGroup").value =
        employee.bloodGroup || "";


    document.getElementById("editEmpEmployeeId").value =
        employee.employeeId || "";


    document.getElementById("editEmpDepartment").value =
        employee.department || "";


    document.getElementById("editEmpDesignation").value =
        employee.designation || "";


    document.getElementById("editEmpJoinDate").value =
        employee.joinDate || "";


    document.getElementById("editEmpType").value =
        employee.employmentType || "";


    document.getElementById("editEmpLocation").value =
        employee.workLocation || "";


    document.getElementById("editEmpAddress1").value =
        employee.address1 || "";


    document.getElementById("editEmpAddress2").value =
        employee.address2 || "";


    document.getElementById("editEmpCity").value =
        employee.city || "";


    document.getElementById("editEmpState").value =
        employee.state || "";


    document.getElementById("editEmpCountry").value =
        employee.country || "";


    document.getElementById("editEmpPostal").value =
        employee.postalCode || "";


    document.getElementById("editEmpEmergencyName").value =
        employee.emergencyName || "";


    document.getElementById("editEmpEmergencyRelation").value =
        employee.emergencyRelation || "";


    document.getElementById("editEmpEmergencyPhone").value =
        employee.emergencyPhone || "";


    document.getElementById("editEmpEmergencyEmail").value =
        employee.emergencyEmail || "";


    document
        .getElementById("editEmployeeModal")
        .classList
        .add("active");
}


function closeEditEmployeeModal() {

    document
        .getElementById("editEmployeeModal")
        .classList
        .remove("active");
}


// ============================================================
// UPDATE EMPLOYEE
// ============================================================

async function updateEmployee() {

    const uid =
        document.getElementById("editEmpId").value;


    const name =
        document.getElementById("editEmpName")
            .value
            .trim();


    const email =
        document.getElementById("editEmpEmail")
            .value
            .trim();


    if (!name || !email) {

        showNotification(
            "Please fill in all required fields"
        );

        return;
    }


    const duplicate =
        employees.some(
            emp =>
                emp.email &&
                emp.email.toLowerCase() ===
                email.toLowerCase() &&
                emp.id !== uid
        );


    if (duplicate) {

        showNotification(
            "An employee with this email already exists"
        );

        return;
    }


    const employeeData = {

        uid: uid,

        email: email,

        fullName: name,


        phoneNumber:
            document.getElementById("editEmpPhone").value,

        dateOfBirth:
            document.getElementById("editEmpDob").value,

        gender:
            document.getElementById("editEmpGender").value,

        bloodGroup:
            document.getElementById("editEmpBloodGroup").value,


        employeeId:
            document.getElementById("editEmpEmployeeId").value,

        department:
            document.getElementById("editEmpDepartment").value,

        designation:
            document.getElementById("editEmpDesignation").value,

        joinDate:
            document.getElementById("editEmpJoinDate").value,

        employmentType:
            document.getElementById("editEmpType").value,

        workLocation:
            document.getElementById("editEmpLocation").value,


        addressLine1:
            document.getElementById("editEmpAddress1").value,

        addressLine2:
            document.getElementById("editEmpAddress2").value,

        city:
            document.getElementById("editEmpCity").value,

        state:
            document.getElementById("editEmpState").value,

        country:
            document.getElementById("editEmpCountry").value,

        postalCode:
            document.getElementById("editEmpPostal").value,


        contactName:
            document.getElementById("editEmpEmergencyName").value,

        relationship:
            document.getElementById("editEmpEmergencyRelation").value,

        emergencyPhoneNumber:
            document.getElementById("editEmpEmergencyPhone").value,

        emergencyEmail:
            document.getElementById("editEmpEmergencyEmail").value
    };


    try {

        showNotification(
            "Updating employee..."
        );


        const data =
            await apiRequest(
                "/api/update-employee",
                {
                    method: "POST",

                    body:
                        JSON.stringify(employeeData)
                }
            );


        closeEditEmployeeModal();


        showNotification(
            data.message ||
            "Employee updated successfully"
        );


        await loadEmployees();


    } catch (error) {

        console.error(
            "Update employee error:",
            error
        );


        showNotification(
            error.message ||
            "Failed to update employee"
        );
    }
}


// ============================================================
// RESET PASSWORD
// ============================================================

function openResetPasswordModal(id) {

    resetPasswordEmployeeId = id;

    document.getElementById("resetEmpId").value =
        id;


    document
        .getElementById("resetPasswordModal")
        .classList
        .add("active");
}


function closeResetPasswordModal() {

    document
        .getElementById("resetPasswordModal")
        .classList
        .remove("active");


    document
        .getElementById("resetPasswordForm")
        .reset();


    resetPasswordEmployeeId = null;
}


async function resetPassword() {

    const newPassword =
        document.getElementById("newPassword")
            .value;


    const confirmPassword =
        document.getElementById("confirmPassword")
            .value;


    if (!newPassword || !confirmPassword) {

        showNotification(
            "Please fill in all fields"
        );

        return;
    }


    if (newPassword.length < 6) {

        showNotification(
            "Password must be at least 6 characters"
        );

        return;
    }


    if (newPassword !== confirmPassword) {

        showNotification(
            "Passwords do not match"
        );

        return;
    }


    if (!resetPasswordEmployeeId) {

        showNotification(
            "Employee not selected"
        );

        return;
    }


    try {

        const data =
            await apiRequest(
                "/api/reset-employee-password",
                {
                    method: "POST",

                    body: JSON.stringify({
                        uid:
                            resetPasswordEmployeeId,

                        password:
                            newPassword
                    })
                }
            );


        closeResetPasswordModal();


        showNotification(
            data.message ||
            "Password reset successfully"
        );


    } catch (error) {

        console.error(
            "Reset password error:",
            error
        );


        showNotification(
            error.message ||
            "Failed to reset password"
        );
    }
}


// ============================================================
// DELETE EMPLOYEE
// ============================================================

function openDeleteEmployeeModal(id) {

    deleteEmployeeId = id;

    document
        .getElementById("deleteEmployeeModal")
        .classList
        .add("active");


    const confirmBtn =
        document.getElementById(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.onclick =
            deleteEmployee;
    }
}


function closeDeleteEmployeeModal() {

    document
        .getElementById("deleteEmployeeModal")
        .classList
        .remove("active");


    deleteEmployeeId = null;
}


async function deleteEmployee() {
    if (!deleteEmployeeId) {
        return;
    }

    const uid = deleteEmployeeId;

    try {
        showNotification("Deleting employee...");

        const data = await apiRequest(
            "/api/delete-employee",
            {
                method: "POST",
                body: JSON.stringify({
                    uid: uid
                })
            }
        );

        showNotification(
            data.message ||
            "Employee deleted successfully"
        );

        await loadEmployees();

    } catch (error) {
        console.error(
            "Delete employee error:",
            error
        );

        showNotification(
            error.message ||
            "Failed to delete employee"
        );

    } finally {
        closeDeleteEmployeeModal();
    }
}

// ============================================================
// PAYROLL UI
// ============================================================

function openPayrollModal() {

    populatePayrollEmployeeSelect();

    const modal =
        document.getElementById("payrollModal");

    if (!modal) {
        console.error("payrollModal not found");
        return;
    }

    modal.classList.add("active");
}


function closePayrollModal() {

    const modal =
        document.getElementById("payrollModal");

    if (modal) {
        modal.classList.remove("active");
    }

    const form =
        document.getElementById("payrollForm");

    if (form) {
        form.reset();
    }

    const display =
        document.getElementById("netSalaryDisplay");

    if (display) {
        display.textContent = "$0";
    }
}


// ============================================================
// PAYROLL CALCULATION
// ============================================================

function initPayrollCalculation() {

    const basicInput =
        document.getElementById("payrollBasic");

    const allowancesInput =
        document.getElementById("payrollAllowances");

    const deductionsInput =
        document.getElementById("payrollDeductions");

    const display =
        document.getElementById("netSalaryDisplay");


    if (
        !basicInput ||
        !allowancesInput ||
        !deductionsInput ||
        !display
    ) {
        return;
    }


    const calculateNet = () => {

        const basic =
            Number(basicInput.value) || 0;

        const allowances =
            Number(allowancesInput.value) || 0;

        const deductions =
            Number(deductionsInput.value) || 0;

        const net =
            basic +
            allowances -
            deductions;

        display.textContent =
            `₹${net.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}`;
    };


    basicInput.addEventListener(
        "input",
        calculateNet
    );

    allowancesInput.addEventListener(
        "input",
        calculateNet
    );

    deductionsInput.addEventListener(
        "input",
        calculateNet
    );

    calculateNet();
}


// ============================================================
// PAYROLL EMPLOYEE SELECT
// ============================================================

function populatePayrollEmployeeSelect() {

    const select =
        document.getElementById(
            "payrollEmployee"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        `
            <option value="">
                Select Employee
            </option>
        ` +
        employees.map(employee => {

            return `
                <option
                    value="${escapeHTML(employee.id)}"
                >
                    ${escapeHTML(employee.name || "Employee")}
                    (${escapeHTML(
                        employee.employeeId || "--"
                    )})
                </option>
            `;

        }).join("");
}


// ============================================================
// RENDER PAYROLL
// ============================================================

function renderPayroll() {

    const tableBody =
        document.getElementById(
            "payrollTableBody"
        );

    const emptyState =
        document.getElementById(
            "payrollEmptyState"
        );

    if (!tableBody) {
        return;
    }


    if (
        !payrollRecords ||
        payrollRecords.length === 0
    ) {

        tableBody.innerHTML = "";

        if (emptyState) {
            emptyState.style.display = "flex";
        }

        return;
    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    tableBody.innerHTML =
        payrollRecords.map(record => {

            const employee =
                employees.find(
                    employee =>
                        employee.id ===
                        record.employeeId
                );


            const basicSalary =
                Number(
                    record.basicSalary || 0
                );

            const allowances =
                Number(
                    record.allowances || 0
                );

            const deductions =
                Number(
                    record.deductions || 0
                );

            const netSalary =
                Number(
                    record.netSalary ??
                    (
                        basicSalary +
                        allowances -
                        deductions
                    )
                );


            const employeeName =
                employee?.name ||
                "Deleted Employee";

            const employeeCode =
                employee?.employeeId ||
                "--";


            const money =
                value =>
                    `₹${value.toLocaleString(
                        "en-IN",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )}`;


            return `
                <tr>

                    <td>

                        <div class="employee-cell">

                            <div class="employee-cell-avatar">
                                ${escapeHTML(
                                    getInitials(
                                        employeeName
                                    )
                                )}
                            </div>

                            <div class="employee-cell-info">

                                <span
                                    class="employee-cell-name"
                                >
                                    ${escapeHTML(
                                        employeeName
                                    )}
                                </span>

                                <span
                                    class="employee-cell-email"
                                >
                                    ${escapeHTML(
                                        employeeCode
                                    )}
                                </span>

                            </div>

                        </div>

                    </td>


                    <td>
                        ${money(basicSalary)}
                    </td>


                    <td>
                        ${money(allowances)}
                    </td>


                    <td>
                        ${money(deductions)}
                    </td>


                    <td>
                        <strong>
                            ${money(netSalary)}
                        </strong>
                    </td>


                    <td>

                        <div class="action-buttons">

                            <button
                                class="action-btn delete"
                                onclick="deletePayroll('${escapeHTML(record.id)}')"
                                aria-label="Delete payroll"
                                title="Delete"
                            >

                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <polyline
                                        points="3 6 5 6 21 6"
                                    ></polyline>

                                    <path
                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                    ></path>

                                    <line
                                        x1="10"
                                        y1="11"
                                        x2="10"
                                        y2="17"
                                    ></line>

                                    <line
                                        x1="14"
                                        y1="11"
                                        x2="14"
                                        y2="17"
                                    ></line>

                                </svg>

                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }).join("");
}

// ============================================================
// PAYROLL
// ============================================================

async function loadPayroll() {
    try {
        const data = await apiRequest("/api/payroll", {
            method: "GET"
        });

        payrollRecords = Array.isArray(data.payroll)
            ? data.payroll
            : [];

        renderPayroll();

    } catch (error) {
        console.error("Error loading payroll:", error);

        payrollRecords = [];

        renderPayroll();

        showNotification(
            error.message || "Failed to load payroll"
        );
    }
}
async function addPayroll() {
    const employeeId =
        document.getElementById("payrollEmployee").value;

    const basicSalary =
        parseFloat(
            document.getElementById("payrollBasic").value
        );

    const allowances =
        parseFloat(
            document.getElementById("payrollAllowances").value
        ) || 0;

    const deductions =
        parseFloat(
            document.getElementById("payrollDeductions").value
        ) || 0;

    const month =
        document.getElementById("payrollMonth").value;


    // Validation
    if (!employeeId) {
        showNotification("Please select an employee");
        return;
    }

    if (
        !Number.isFinite(basicSalary) ||
        basicSalary < 0
    ) {
        showNotification("Please enter a valid basic salary");
        return;
    }

    if (allowances < 0 || deductions < 0) {
        showNotification(
            "Allowances and deductions cannot be negative"
        );
        return;
    }

    if (!month) {
        showNotification("Please select a payroll month");
        return;
    }


    try {
        showNotification("Adding payroll...");


        const data = await apiRequest(
            "/api/payroll",
            {
                method: "POST",

                body: JSON.stringify({
                    employeeId,
                    basicSalary,
                    allowances,
                    deductions,
                    month
                })
            }
        );


        await loadPayroll();

        closePayrollModal();

        showNotification(
            data.message ||
            "Payroll added successfully"
        );

    } catch (error) {

        console.error(
            "Add payroll error:",
            error
        );

        showNotification(
            error.message ||
            "Failed to add payroll"
        );
    }
}
async function deletePayroll(id) {

    if (!id) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this payroll record?"
        );

    if (!confirmed) {
        return;
    }


    try {

        showNotification("Deleting payroll...");


        const data = await apiRequest(
            "/api/payroll",
            {
                method: "DELETE",

                body: JSON.stringify({
                    id
                })
            }
        );


        await loadPayroll();


        showNotification(
            data.message ||
            "Payroll deleted successfully"
        );

    } catch (error) {

        console.error(
            "Delete payroll error:",
            error
        );

        showNotification(
            error.message ||
            "Failed to delete payroll"
        );
    }
}
// ============================================================
// STATISTICS
// ============================================================

function updateStats() {

    const totalEmployees =
        employees.length;


    const totalEmployeesStat =
        document.getElementById(
            "totalEmployeesStat"
        );


    if (totalEmployeesStat) {

        totalEmployeesStat.textContent =
            totalEmployees;
    }


    const departments =
        new Set(
            employees
                .map(
                    emp =>
                        emp.department
                )
                .filter(Boolean)
        );


    const totalDepartmentsStat =
        document.getElementById(
            "totalDepartmentsStat"
        );


    if (totalDepartmentsStat) {

        totalDepartmentsStat.textContent =
            departments.size;
    }
}


// ============================================================
// UTILITY
// ============================================================

function getInitials(name) {

    if (!name) {
        return "--";
    }


    return name
        .split(" ")
        .map(
            word =>
                word[0]
        )
        .join("")
        .toUpperCase()
        .slice(0, 2);
}


// ============================================================
// PASSWORD TOGGLE
// ============================================================

function togglePassword(inputId) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) return;


    const type =
        input.getAttribute("type") ===
            "password"
            ? "text"
            : "password";


    input.setAttribute(
        "type",
        type
    );
}


// ============================================================
// NOTIFICATION
// ============================================================

function showNotification(message) {

    const existingNotifications =
        document.querySelectorAll(
            ".toast-notification"
        );


    existingNotifications.forEach(
        notification =>
            notification.remove()
    );


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "toast-notification";


    notification.innerHTML = `

        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >

            <path
                d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
            ></path>

            <polyline
                points="22 4 12 14.01 9 11.01"
            ></polyline>

        </svg>

        <span>
            ${escapeHtml(message)}
        </span>
    `;


    document.body.appendChild(
        notification
    );


    notification.style.cssText = `

        position: fixed;

        bottom: 2rem;

        right: 2rem;

        background:
            rgba(255, 255, 255, 0.1);

        backdrop-filter:
            blur(16px);

        -webkit-backdrop-filter:
            blur(16px);

        border:
            1px solid
            rgba(255, 255, 255, 0.2);

        border-radius:
            0.75rem;

        padding:
            1rem 1.5rem;

        color:
            white;

        font-size:
            0.875rem;

        font-weight:
            500;

        display:
            flex;

        align-items:
            center;

        gap:
            0.75rem;

        z-index:
            1000;

        animation:
            slideInRight 0.3s ease;

        box-shadow:
            0 10px 30px
            rgba(0, 0, 0, 0.3);
    `;


    if (
        !document.getElementById(
            "notificationStyles"
        )
    ) {

        const style =
            document.createElement(
                "style"
            );


        style.id =
            "notificationStyles";


        style.textContent = `

            @keyframes slideInRight {

                from {
                    transform:
                        translateX(100%);

                    opacity:
                        0;
                }

                to {
                    transform:
                        translateX(0);

                    opacity:
                        1;
                }
            }


            @keyframes slideOutRight {

                from {
                    transform:
                        translateX(0);

                    opacity:
                        1;
                }

                to {
                    transform:
                        translateX(100%);

                    opacity:
                        0;
                }
            }
        `;


        document.head.appendChild(
            style
        );
    }


    setTimeout(() => {

        notification.style.animation =
            "slideOutRight 0.3s ease";


        setTimeout(() => {

            notification.remove();

        }, 300);

    }, 3000);
};


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.openAddEmployeeModal =
    openAddEmployeeModal;

window.closeAddEmployeeModal =
    closeAddEmployeeModal;

window.addEmployee =
    addEmployee;

window.openEditEmployeeModal =
    openEditEmployeeModal;

window.closeEditEmployeeModal =
    closeEditEmployeeModal;

window.updateEmployee =
    updateEmployee;

window.openDeleteEmployeeModal =
    openDeleteEmployeeModal;

window.closeDeleteEmployeeModal =
    closeDeleteEmployeeModal;

window.deleteEmployee =
    deleteEmployee;

window.openPayrollModal =
    openPayrollModal;

window.closePayrollModal =
    closePayrollModal;

window.addPayroll =
    addPayroll;

window.deletePayroll =
    deletePayroll;

window.openResetPasswordModal =
    openResetPasswordModal;

window.closeResetPasswordModal =
    closeResetPasswordModal;

window.resetPassword =
    resetPassword;

window.togglePassword =
    togglePassword;