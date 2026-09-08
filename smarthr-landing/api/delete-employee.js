import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

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

        const hrUid = decodedToken.uid;

        // ============================================================
        // HR AUTHORIZATION
        // ============================================================

        if (
            decodedToken.role !== "hr" &&
            decodedToken.role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only HR can delete employees"
            });
        }

        const { uid } = req.body || {};

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: "Employee UID is required"
            });
        }

        // Prevent HR from deleting themselves
        if (uid === hrUid) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        // ============================================================
        // CHECK EMPLOYEE AUTH ACCOUNT
        // ============================================================

        try {
            await adminAuth.getUser(uid);
        } catch (error) {

            if (error.code === "auth/user-not-found") {
                return res.status(404).json({
                    success: false,
                    message: "Employee account not found"
                });
            }

            throw error;
        }

        // ============================================================
        // DELETE LEAVE REQUESTS
        // ============================================================

        const leaveSnapshot = await adminDb
            .collection("leaveRequests")
            .where("employeeId", "==", uid)
            .get();

        if (!leaveSnapshot.empty) {

            const batch = adminDb.batch();

            leaveSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        }

        // ============================================================
        // DELETE PAYROLL RECORDS
        // ============================================================

        const payrollSnapshot = await adminDb
            .collection("payroll")
            .where("employeeId", "==", uid)
            .get();

        if (!payrollSnapshot.empty) {

            const batch = adminDb.batch();

            payrollSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        }

        // ============================================================
        // DELETE ATTENDANCE RECORDS
        // ============================================================

        const attendanceSnapshot = await adminDb
            .collection("attendance")
            .where("employeeId", "==", uid)
            .get();

        if (!attendanceSnapshot.empty) {

            const batch = adminDb.batch();

            attendanceSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        }

        // ============================================================
        // DELETE EMPLOYEE FIRESTORE DOCUMENT
        // ============================================================

        await adminDb
            .collection("employees")
            .doc(uid)
            .delete();

        // ============================================================
        // DELETE USERS DOCUMENT
        // ============================================================

        await adminDb
            .collection("users")
            .doc(uid)
            .delete();

        // ============================================================
        // DELETE FIREBASE AUTH ACCOUNT
        // ============================================================

        await adminAuth.deleteUser(uid);

        // ============================================================
        // SUCCESS
        // ============================================================

        return res.status(200).json({
            success: true,
            message: "Employee and all related data deleted successfully"
        });

    } catch (error) {

        console.error(
            "Delete employee error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to completely delete employee"
        });
    }
}