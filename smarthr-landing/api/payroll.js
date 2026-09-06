import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
    try {
        // ============================================================
        // AUTHENTICATION
        // ============================================================

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
        const role = decodedToken.role;


        // ============================================================
        // GET PAYROLL
        // ============================================================

        if (req.method === "GET") {

            // --------------------------------------------------------
            // EMPLOYEE
            // Employee can see ONLY their own payroll
            // --------------------------------------------------------

            if (role === "employee") {

                const snapshot = await adminDb
                    .collection("payroll")
                    .where("employeeId", "==", uid)
                    .get();

                const payroll = [];

                snapshot.forEach((doc) => {
                    payroll.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                payroll.sort((a, b) => {
                    return (b.month || "")
                        .localeCompare(a.month || "");
                });

                return res.status(200).json({
                    success: true,
                    payroll
                });
            }


            // --------------------------------------------------------
            // HR / ADMIN
            // HR can see ALL payroll records
            // --------------------------------------------------------

            if (role === "hr" || role === "admin") {

                const snapshot = await adminDb
                    .collection("payroll")
                    .get();

                const payroll = [];

                snapshot.forEach((doc) => {
                    payroll.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                payroll.sort((a, b) => {
                    return (b.month || "")
                        .localeCompare(a.month || "");
                });

                return res.status(200).json({
                    success: true,
                    payroll
                });
            }


            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }


        // ============================================================
        // HR CREATE PAYROLL
        // ============================================================

        if (req.method === "POST") {

            if (role !== "hr" && role !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Only HR can manage payroll"
                });
            }

            const {
                employeeId,
                basicSalary,
                allowances,
                deductions,
                month
            } = req.body || {};


            // --------------------------------------------------------
            // VALIDATION
            // --------------------------------------------------------

            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    message: "Employee is required"
                });
            }

            if (
                basicSalary === undefined ||
                basicSalary === null ||
                basicSalary === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Basic salary is required"
                });
            }

            if (!month) {
                return res.status(400).json({
                    success: false,
                    message: "Payroll month is required"
                });
            }


            const basic =
                Number(basicSalary);

            const allowanceAmount =
                Number(allowances || 0);

            const deductionAmount =
                Number(deductions || 0);


            if (
                !Number.isFinite(basic) ||
                basic < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid basic salary"
                });
            }

            if (
                !Number.isFinite(allowanceAmount) ||
                allowanceAmount < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid allowances"
                });
            }

            if (
                !Number.isFinite(deductionAmount) ||
                deductionAmount < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid deductions"
                });
            }


            // --------------------------------------------------------
            // CHECK EMPLOYEE EXISTS
            // --------------------------------------------------------

            try {
                await adminAuth.getUser(employeeId);
            } catch (error) {

                if (error.code === "auth/user-not-found") {
                    return res.status(404).json({
                        success: false,
                        message: "Employee account not found"
                    });
                }

                throw error;
            }


            // --------------------------------------------------------
            // CHECK DUPLICATE MONTH
            // --------------------------------------------------------

            const existingPayroll =
                await adminDb
                    .collection("payroll")
                    .where("employeeId", "==", employeeId)
                    .where("month", "==", month)
                    .limit(1)
                    .get();

            if (!existingPayroll.empty) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Payroll already exists for this employee and month"
                });
            }


            // --------------------------------------------------------
            // CALCULATE NET SALARY
            // --------------------------------------------------------

            const netSalary =
                basic +
                allowanceAmount -
                deductionAmount;


            // --------------------------------------------------------
            // CREATE FIRESTORE DOCUMENT
            // --------------------------------------------------------

            const now =
                new Date().toISOString();

            const payrollRef =
                await adminDb
                    .collection("payroll")
                    .add({
                        employeeId,

                        basicSalary: basic,

                        allowances:
                            allowanceAmount,

                        deductions:
                            deductionAmount,

                        netSalary,

                        month,

                        createdAt: now,

                        updatedAt: now,

                        createdBy: uid
                    });


            return res.status(201).json({
                success: true,
                message:
                    "Payroll added successfully",

                payroll: {
                    id: payrollRef.id,
                    employeeId,
                    basicSalary: basic,
                    allowances: allowanceAmount,
                    deductions: deductionAmount,
                    netSalary,
                    month,
                    createdAt: now,
                    updatedAt: now,
                    createdBy: uid
                }
            });
        }


        // ============================================================
        // DELETE PAYROLL
        // ============================================================

        if (req.method === "DELETE") {

            if (role !== "hr" && role !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Only HR can delete payroll"
                });
            }

            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Payroll ID is required"
                });
            }


            const payrollRef =
                adminDb
                    .collection("payroll")
                    .doc(id);

            const payrollDoc =
                await payrollRef.get();

            if (!payrollDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Payroll record not found"
                });
            }


            await payrollRef.delete();


            return res.status(200).json({
                success: true,
                message:
                    "Payroll deleted successfully"
            });
        }


        // ============================================================
        // METHOD NOT ALLOWED
        // ============================================================

        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });

    } catch (error) {

        console.error(
            "Payroll API error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to process payroll"
        });
    }
}