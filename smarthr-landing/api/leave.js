import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {

    // ============================================================
    // AUTHENTICATION
    // ============================================================

    try {

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const idToken =
            authHeader.split("Bearer ")[1];

        const decodedToken =
            await adminAuth.verifyIdToken(idToken);

        const uid = decodedToken.uid;


        // ========================================================
        // ONLY EMPLOYEES CAN SUBMIT LEAVE
        // ========================================================

        if (decodedToken.role !== "employee") {
            return res.status(403).json({
                success: false,
                message: "Only employees can apply for leave"
            });
        }


        // ========================================================
        // GET MY LEAVE REQUESTS
        // ========================================================

        if (req.method === "GET") {

            const snapshot =
                await adminDb
                    .collection("leaveRequests")
                    .where("employeeId", "==", uid)
                    .get();

            const requests = [];

            snapshot.forEach((doc) => {

                requests.push({
                    id: doc.id,
                    ...doc.data()
                });

            });


            // Newest requests first
            requests.sort((a, b) => {

                const dateA =
                    a.createdAt || "";

                const dateB =
                    b.createdAt || "";

                return dateB.localeCompare(dateA);

            });


            return res.status(200).json({
                success: true,
                requests
            });
        }


        // ========================================================
        // SUBMIT NEW LEAVE REQUEST
        // ========================================================

        if (req.method === "POST") {

            const {
                leaveType,
                startDate,
                endDate,
                reason
            } = req.body || {};


            // ----------------------------------------------------
            // VALIDATION
            // ----------------------------------------------------

            if (!leaveType) {

                return res.status(400).json({
                    success: false,
                    message: "Leave type is required"
                });

            }


            if (!startDate) {

                return res.status(400).json({
                    success: false,
                    message: "Start date is required"
                });

            }


            if (!endDate) {

                return res.status(400).json({
                    success: false,
                    message: "End date is required"
                });

            }


            if (!reason || !reason.trim()) {

                return res.status(400).json({
                    success: false,
                    message: "Reason is required"
                });

            }


            // ----------------------------------------------------
            // DATE VALIDATION
            // ----------------------------------------------------

            const start =
                new Date(startDate);

            const end =
                new Date(endDate);


            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid leave dates"
                });

            }


            if (end < start) {

                return res.status(400).json({
                    success: false,
                    message:
                        "End date cannot be before start date"
                });

            }


            // ----------------------------------------------------
            // CALCULATE NUMBER OF DAYS
            // ----------------------------------------------------

            const millisecondsPerDay =
                1000 * 60 * 60 * 24;

            const leaveDays =
                Math.floor(
                    (
                        end.getTime() -
                        start.getTime()
                    ) /
                    millisecondsPerDay
                ) + 1;


            // ----------------------------------------------------
            // GET EMPLOYEE INFORMATION
            // ----------------------------------------------------

            const employeeDoc =
                await adminDb
                    .collection("employees")
                    .doc(uid)
                    .get();


            if (!employeeDoc.exists) {

                return res.status(404).json({
                    success: false,
                    message: "Employee profile not found"
                });

            }


            const employee =
                employeeDoc.data();


            const personal =
                employee.personalInformation || {};

            const employment =
                employee.employmentInformation || {};


            // ----------------------------------------------------
            // GET EMAIL FROM AUTH
            // ----------------------------------------------------

            const authUser =
                await adminAuth.getUser(uid);


            // ----------------------------------------------------
            // CREATE LEAVE REQUEST
            // ----------------------------------------------------

            const now =
                new Date().toISOString();


            const leaveRequest = {

                employeeId: uid,

                employeeName:
                    personal.fullName ||
                    authUser.displayName ||
                    "Employee",

                employeeEmail:
                    authUser.email || "",

                employeeCode:
                    employee.employeeId || "",

                department:
                    employment.department || "",

                designation:
                    employment.designation || "",

                leaveType:
                    leaveType,

                startDate:
                    startDate,

                endDate:
                    endDate,

                leaveDays:
                    leaveDays,

                reason:
                    reason.trim(),

                status:
                    "Pending",

                createdAt:
                    now,

                updatedAt:
                    now

            };


            // ----------------------------------------------------
            // SAVE TO FIRESTORE
            // ----------------------------------------------------

            const leaveRef =
                await adminDb
                    .collection("leaveRequests")
                    .add(leaveRequest);


            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    "Leave request submitted successfully",

                request: {
                    id: leaveRef.id,
                    ...leaveRequest
                }

            });

        }


        // ========================================================
        // METHOD NOT ALLOWED
        // ========================================================

        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });


    } catch (error) {

        console.error(
            "Leave API error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to process leave request",

            error:
                error.message

        });

    }
}