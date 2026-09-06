import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {

    // ---------------------------------------------------------
    // Only GET is allowed
    // ---------------------------------------------------------

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {

        // -----------------------------------------------------
        // Verify authentication
        // -----------------------------------------------------

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
            await adminAuth.verifyIdToken(
                idToken
            );

        const uid =
            decodedToken.uid;


        // -----------------------------------------------------
        // Employee only
        // -----------------------------------------------------

        if (
            decodedToken.role !== "employee"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only employees can access their leave requests"
            });
        }


        // -----------------------------------------------------
        // Get employee's leave requests
        // -----------------------------------------------------

        const snapshot =
            await adminDb
                .collection("leaveRequests")
                .where(
                    "employeeId",
                    "==",
                    uid
                )
                .get();


        const leaveRequests = [];

        snapshot.forEach(doc => {

            leaveRequests.push({
                id: doc.id,
                ...doc.data()
            });

        });


        // -----------------------------------------------------
        // Sort newest requests first
        // -----------------------------------------------------

        leaveRequests.sort((a, b) => {

            return (
                (b.createdAt || "")
                    .localeCompare(
                        a.createdAt || ""
                    )
            );

        });


        // -----------------------------------------------------
        // Calculate statistics
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // Response
        // -----------------------------------------------------

        return res.status(200).json({

            success: true,

            stats: {
                total,
                pending,
                approved,
                rejected
            },

            leaveRequests

        });

    } catch (error) {

        console.error(
            "Get leave requests error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to load leave requests"
        });
    }
}