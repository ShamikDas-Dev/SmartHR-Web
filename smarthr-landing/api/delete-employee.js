import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {
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

        // Only HR/Admin can delete employees
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

        // Prevent HR from deleting their own account
        if (uid === hrUid) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        // Check whether employee exists
        let employeeExists = false;

        try {
            await adminAuth.getUser(uid);
            employeeExists = true;
        } catch (error) {
            if (error.code !== "auth/user-not-found") {
                throw error;
            }
        }

        if (!employeeExists) {
            return res.status(404).json({
                success: false,
                message: "Employee account not found"
            });
        }

        // Delete employee Firestore document
        await adminDb
            .collection("employees")
            .doc(uid)
            .delete();

        // Delete users Firestore document
        await adminDb
            .collection("users")
            .doc(uid)
            .delete();

        // Delete Firebase Authentication account
        await adminAuth.deleteUser(uid);

        return res.status(200).json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (error) {
        console.error("Delete employee error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete employee"
        });
    }
}