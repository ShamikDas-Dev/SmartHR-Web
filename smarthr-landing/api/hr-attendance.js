import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {
        // -----------------------------
        // Verify authentication
        // -----------------------------

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const idToken = authHeader.split("Bearer ")[1];

        const decodedToken =
            await adminAuth.verifyIdToken(idToken);

        // -----------------------------
        // HR ONLY
        // -----------------------------

        if (
            decodedToken.role !== "hr" &&
            decodedToken.role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only HR can view attendance"
            });
        }

        // -----------------------------
        // Get today's date in India
        // -----------------------------

        const now = new Date();

        const today =
            new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Kolkata"
            }).format(now);

        // -----------------------------
        // Get employees
        // -----------------------------

        const employeesSnapshot =
            await adminDb
                .collection("employees")
                .get();

        // -----------------------------
        // Get today's attendance
        // -----------------------------

        const attendanceSnapshot =
            await adminDb
                .collection("attendance")
                .where("date", "==", today)
                .get();

        // Create quick lookup
        const attendanceMap = {};

        attendanceSnapshot.forEach((doc) => {
            const data = doc.data();

            attendanceMap[data.employeeId] = {
                id: doc.id,
                ...data
            };
        });

        // -----------------------------
        // Build HR attendance list
        // -----------------------------

        const attendance = [];

        employeesSnapshot.forEach((doc) => {
            const employee = doc.data();

            const personal =
                employee.personalInformation || {};

            const employment =
                employee.employmentInformation || {};

            const employeeAttendance =
                attendanceMap[doc.id];

            let status = "Not Checked In";

            if (employeeAttendance) {
                if (employeeAttendance.checkOut) {
                    status = "Checked Out";
                } else {
                    status = "Present";
                }
            }

            attendance.push({
                uid: doc.id,

                name:
                    personal.fullName ||
                    employee.fullName ||
                    "Unknown",

                employeeId:
                    employee.employeeId ||
                    employment.employeeId ||
                    "N/A",

                department:
                    employment.department ||
                    employee.department ||
                    "N/A",

                checkIn:
                    employeeAttendance?.checkIn ||
                    null,

                checkOut:
                    employeeAttendance?.checkOut ||
                    null,

                status,

                attendanceId:
                    employeeAttendance?.id ||
                    null
            });
        });

        // -----------------------------
        // Calculate statistics
        // -----------------------------

        const totalEmployees =
            attendance.length;

        const presentToday =
            attendance.filter(
                employee =>
                    employee.status === "Present"
            ).length;

        const checkedOut =
            attendance.filter(
                employee =>
                    employee.status === "Checked Out"
            ).length;

        const notCheckedIn =
            attendance.filter(
                employee =>
                    employee.status === "Not Checked In"
            ).length;

        // -----------------------------
        // Response
        // -----------------------------

        return res.status(200).json({
            success: true,

            date: today,

            stats: {
                totalEmployees,
                presentToday,
                checkedOut,
                notCheckedIn
            },

            attendance
        });

    } catch (error) {
        console.error(
            "HR attendance error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load attendance"
        });
    }
}