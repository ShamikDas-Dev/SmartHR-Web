import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
    try {
        // ==========================================
        // AUTHENTICATION
        // ==========================================
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

        const uid = decodedToken.uid;

        // Check role from custom claim
        const isHR =
            decodedToken.role === "hr" ||
            decodedToken.role === "admin";

        // ==========================================
        // HR ATTENDANCE - GET ALL EMPLOYEES
        // ==========================================
        if (req.method === "GET" && isHR) {
            const now = new Date();

            const indiaDate =
                new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Kolkata"
                }).format(now);

            // Get all employees
            const employeesSnapshot =
                await adminDb
                    .collection("employees")
                    .get();

            // Get today's attendance
            const attendanceSnapshot =
                await adminDb
                    .collection("attendance")
                    .where("date", "==", indiaDate)
                    .get();

            const attendanceMap = new Map();

            attendanceSnapshot.forEach((doc) => {
                const data = doc.data();

                attendanceMap.set(
                    data.employeeId,
                    {
                        id: doc.id,
                        ...data
                    }
                );
            });

            const attendance = [];

            employeesSnapshot.forEach((doc) => {
                const employee = doc.data();

                const personal =
                    employee.personalInformation || {};

                const employment =
                    employee.employmentInformation || {};

                const employeeAttendance =
                    attendanceMap.get(doc.id);

                let status = "Not Checked In";
                let checkIn = null;
                let checkOut = null;

                if (employeeAttendance) {
                    checkIn =
                        employeeAttendance.checkIn || null;

                    checkOut =
                        employeeAttendance.checkOut || null;

                    if (checkOut) {
                        status = "Checked Out";
                    } else if (checkIn) {
                        status = "Present";
                    }
                }

                attendance.push({
                    id: employeeAttendance?.id || doc.id,
                    employeeId:
                        employee.employeeId || "",
                    name:
                        personal.fullName || "Employee",
                    department:
                        employment.department || "",
                    checkIn,
                    checkOut,
                    status
                });
            });

            // Statistics
            const totalEmployees =
                employeesSnapshot.size;

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

            return res.status(200).json({
                success: true,
                stats: {
                    totalEmployees,
                    presentToday,
                    checkedOut,
                    notCheckedIn
                },
                attendance
            });
        }

        // ==========================================
        // EMPLOYEE - GET OWN ATTENDANCE
        // ==========================================
        if (req.method === "GET") {
            if (isHR) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid attendance request"
                });
            }

            const snapshot = await adminDb
                .collection("attendance")
                .where("employeeId", "==", uid)
                .get();

            const attendance = [];

            snapshot.forEach((doc) => {
                attendance.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort newest first
            attendance.sort((a, b) => {
                return (b.date || "").localeCompare(
                    a.date || ""
                );
            });

            return res.status(200).json({
                success: true,
                attendance
            });
        }

        // ==========================================
        // POST ATTENDANCE
        // ==========================================
        if (req.method === "POST") {
            // HR should not perform employee
            // check-in/check-out through this endpoint.
            if (isHR) {
                return res.status(403).json({
                    success: false,
                    message: "HR cannot perform employee attendance actions"
                });
            }

            const { action } = req.body || {};

            if (
                action !== "check-in" &&
                action !== "check-out"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid attendance action"
                });
            }

            // ==========================================
            // INDIA TIME
            // ==========================================
            const now = new Date();

            const indiaDate =
                new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Kolkata"
                }).format(now);

            const indiaTime =
                new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }).format(now);

            // ==========================================
            // FIND TODAY'S RECORD
            // ==========================================
            const attendanceQuery = await adminDb
                .collection("attendance")
                .where("employeeId", "==", uid)
                .where("date", "==", indiaDate)
                .limit(1)
                .get();

            // ==========================================
            // CHECK IN
            // ==========================================
            if (action === "check-in") {
                if (!attendanceQuery.empty) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "You have already checked in today"
                    });
                }

                const attendanceRef =
                    await adminDb
                        .collection("attendance")
                        .add({
                            employeeId: uid,
                            date: indiaDate,
                            checkIn: indiaTime,
                            checkOut: null,
                            status: "Present",
                            createdAt:
                                now.toISOString()
                        });

                return res.status(201).json({
                    success: true,
                    message:
                        `Checked in at ${indiaTime}`,
                    attendance: {
                        id: attendanceRef.id,
                        employeeId: uid,
                        date: indiaDate,
                        checkIn: indiaTime,
                        checkOut: null,
                        status: "Present"
                    }
                });
            }

            // ==========================================
            // CHECK OUT
            // ==========================================
            if (action === "check-out") {
                if (attendanceQuery.empty) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "You have not checked in today"
                    });
                }

                const attendanceDoc =
                    attendanceQuery.docs[0];

                const attendanceData =
                    attendanceDoc.data();

                if (attendanceData.checkOut) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "You have already checked out today"
                    });
                }

                await attendanceDoc.ref.update({
                    checkOut: indiaTime,
                    updatedAt:
                        now.toISOString()
                });

                return res.status(200).json({
                    success: true,
                    message:
                        `Checked out at ${indiaTime}`,
                    attendance: {
                        id: attendanceDoc.id,
                        ...attendanceData,
                        checkOut: indiaTime
                    }
                });
            }
        }

        // ==========================================
        // METHOD NOT ALLOWED
        // ==========================================
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });

    } catch (error) {
        console.error(
            "Attendance API error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to process attendance",
            error: error.message
        });
    }
}