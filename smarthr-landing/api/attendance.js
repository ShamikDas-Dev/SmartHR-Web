import { adminAuth, adminDb } from "./firebaseAdmin.js";

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


        // ==========================================
        // GET ATTENDANCE
        // ==========================================

        if (req.method === "GET") {

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


            // Use India time
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
                        message: "You have already checked in today"
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
                            createdAt: now.toISOString()
                        });


                return res.status(201).json({
                    success: true,
                    message: `Checked in at ${indiaTime}`,
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
                        message: "You have not checked in today"
                    });
                }


                const attendanceDoc =
                    attendanceQuery.docs[0];

                const attendanceData =
                    attendanceDoc.data();


                if (attendanceData.checkOut) {
                    return res.status(400).json({
                        success: false,
                        message: "You have already checked out today"
                    });
                }


                await attendanceDoc.ref.update({
                    checkOut: indiaTime,
                    updatedAt: now.toISOString()
                });


                return res.status(200).json({
                    success: true,
                    message: `Checked out at ${indiaTime}`,
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
            message: "Failed to process attendance",
            error: error.message
        });
    }
}