import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {

    // ---------------------------------------------------------
    // Only POST is allowed
    // ---------------------------------------------------------

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {

        // -----------------------------------------------------
        // Authentication
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
                    "Only employees can submit leave requests"
            });
        }


        // -----------------------------------------------------
        // Get request data
        // -----------------------------------------------------

        const {
            leaveType,
            startDate,
            endDate,
            reason
        } = req.body || {};


        // -----------------------------------------------------
        // Required fields
        // -----------------------------------------------------

        if (
            !leaveType ||
            !startDate ||
            !endDate ||
            !reason
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Leave type, start date, end date and reason are required"
            });
        }


        // -----------------------------------------------------
        // Validate dates
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // Get employee profile
        // -----------------------------------------------------

        const employeeRef =
            adminDb
                .collection("employees")
                .doc(uid);

        const employeeDoc =
            await employeeRef.get();

        if (!employeeDoc.exists) {
            return res.status(404).json({
                success: false,
                message:
                    "Employee profile not found"
            });
        }

        const employee =
            employeeDoc.data();

        const personal =
            employee.personalInformation || {};

        const employment =
            employee.employmentInformation || {};


        // -----------------------------------------------------
        // Employee information
        // -----------------------------------------------------

        const employeeName =
            personal.fullName || "Employee";

        const employeeId =
            employee.employeeId || "";

        const department =
            employment.department || "";

        const designation =
            employment.designation || "";


        // -----------------------------------------------------
        // Check for overlapping pending/approved leave
        // -----------------------------------------------------

        const existingSnapshot =
            await adminDb
                .collection("leaveRequests")
                .where(
                    "employeeId",
                    "==",
                    uid
                )
                .get();

        const hasOverlap =
            existingSnapshot.docs.some(doc => {

                const existing =
                    doc.data();

                if (
                    existing.status !== "Pending" &&
                    existing.status !== "Approved"
                ) {
                    return false;
                }

                const existingStart =
                    new Date(
                        existing.startDate
                    );

                const existingEnd =
                    new Date(
                        existing.endDate
                    );

                return (
                    start <= existingEnd &&
                    end >= existingStart
                );
            });

        if (hasOverlap) {
            return res.status(400).json({
                success: false,
                message:
                    "You already have a pending or approved leave during these dates"
            });
        }


        // -----------------------------------------------------
        // Calculate number of days
        // -----------------------------------------------------

        const millisecondsPerDay =
            1000 * 60 * 60 * 24;

        const leaveDays =
            Math.floor(
                (
                    Date.UTC(
                        end.getFullYear(),
                        end.getMonth(),
                        end.getDate()
                    ) -
                    Date.UTC(
                        start.getFullYear(),
                        start.getMonth(),
                        start.getDate()
                    )
                ) /
                millisecondsPerDay
            ) + 1;


        // -----------------------------------------------------
        // Create leave request
        // -----------------------------------------------------

        const now =
            new Date().toISOString();

        const leaveRequest = {

            employeeId: uid,

            employeeName:
                employeeName,

            employeeCode:
                employeeId,

            department:
                department,

            designation:
                designation,

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


        const leaveRef =
            await adminDb
                .collection("leaveRequests")
                .add(
                    leaveRequest
                );


        // -----------------------------------------------------
        // Success
        // -----------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Leave request submitted successfully",

            leaveRequest: {
                id: leaveRef.id,
                ...leaveRequest
            }

        });

    } catch (error) {

        console.error(
            "Create leave request error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to submit leave request"
        });
    }
}