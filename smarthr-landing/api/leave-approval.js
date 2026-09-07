import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {

    try {

        // ============================================================
        // AUTHENTICATION
        // ============================================================

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

        const hrUid =
            decodedToken.uid;


        // ============================================================
        // HR / ADMIN ONLY
        // ============================================================

        if (
            decodedToken.role !== "hr" &&
            decodedToken.role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only HR can manage leave requests"
            });
        }


        // ============================================================
        // GET ALL LEAVE REQUESTS
        // ============================================================

        if (req.method === "GET") {

            const snapshot =
                await adminDb
                    .collection("leaveRequests")
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


        // ============================================================
        // APPROVE / REJECT LEAVE REQUEST
        // ============================================================

        if (req.method === "POST") {

            const {
                requestId,
                action,
                comment
            } = req.body || {};


            // --------------------------------------------------------
            // VALIDATE REQUEST ID
            // --------------------------------------------------------

            if (!requestId) {

                return res.status(400).json({
                    success: false,
                    message: "Leave request ID is required"
                });

            }


            // --------------------------------------------------------
            // VALIDATE ACTION
            // --------------------------------------------------------

            if (
                action !== "approve" &&
                action !== "reject"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Action must be approve or reject"
                });

            }


            // --------------------------------------------------------
            // FIND LEAVE REQUEST
            // --------------------------------------------------------

            const leaveRef =
                adminDb
                    .collection("leaveRequests")
                    .doc(requestId);

            const leaveDoc =
                await leaveRef.get();


            if (!leaveDoc.exists) {

                return res.status(404).json({
                    success: false,
                    message: "Leave request not found"
                });

            }


            const leaveData =
                leaveDoc.data();


            // --------------------------------------------------------
            // PREVENT CHANGING ALREADY PROCESSED REQUESTS
            // --------------------------------------------------------

            if (
                leaveData.status !== "Pending"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `This leave request has already been ${String(
                            leaveData.status || ""
                        ).toLowerCase()}.`
                });

            }


            // --------------------------------------------------------
            // DETERMINE NEW STATUS
            // --------------------------------------------------------

            const newStatus =
                action === "approve"
                    ? "Approved"
                    : "Rejected";


            const now =
                new Date().toISOString();


            // --------------------------------------------------------
            // UPDATE LEAVE REQUEST
            // --------------------------------------------------------

            await leaveRef.update({

                status: newStatus,

                hrComment:
                    typeof comment === "string"
                        ? comment.trim()
                        : "",

                reviewedBy:
                    hrUid,

                reviewedAt:
                    now,

                updatedAt:
                    now

            });


            // --------------------------------------------------------
            // SUCCESS
            // --------------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    action === "approve"
                        ? "Leave request approved successfully"
                        : "Leave request rejected successfully",

                request: {

                    id: requestId,

                    ...leaveData,

                    status: newStatus,

                    hrComment:
                        typeof comment === "string"
                            ? comment.trim()
                            : "",

                    reviewedBy:
                        hrUid,

                    reviewedAt:
                        now,

                    updatedAt:
                        now

                }

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
            "Leave approval API error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to process leave request"

        });

    }

}