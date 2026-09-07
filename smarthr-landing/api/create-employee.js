import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {
        // ========================================
        // Authentication
        // ========================================

        const authorization = req.headers.authorization;

        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const idToken = authorization.split("Bearer ")[1];

        const decodedToken =
            await adminAuth.verifyIdToken(idToken);


        // ========================================
        // HR Role Check
        // ========================================

        if (
            decodedToken.role !== "hr" &&
            decodedToken.role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only HR can create employees."
            });
        }


        // ========================================
        // Employee Data
        // ========================================

        const {
            email,
            password,

            fullName,
            phoneNumber,
            dateOfBirth,
            gender,
            bloodGroup,

            employeeId,
            department,
            designation,
            joinDate,
            employmentType,
            workLocation,

            addressLine1,
            addressLine2,
            city,
            state,
            country,
            postalCode,

            contactName,
            relationship,
            emergencyPhoneNumber,
            emergencyEmail
        } = req.body;


        // ========================================
        // Required Fields
        // ========================================

        if (
            !email ||
            !password ||
            !fullName ||
            !employeeId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email, password, full name and employee ID are required."
            });
        }


        // ========================================
        // Password Validation
        // ========================================

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 6 characters."
            });
        }


        // ========================================
        // Check Duplicate Employee ID
        // ========================================

        const employeeIdQuery = await adminDb
            .collection("employees")
            .where("employeeId", "==", employeeId)
            .limit(1)
            .get();


        if (!employeeIdQuery.empty) {
            return res.status(409).json({
                success: false,
                message:
                    "This Employee ID already exists."
            });
        }


        // ========================================
        // Create Firebase Authentication Account
        // ========================================

        const employeeUser =
            await adminAuth.createUser({
                email,
                password,
                displayName: fullName,
                disabled: false
            });


        const uid = employeeUser.uid;


        try {

            // ========================================
            // Set Employee Role
            // ========================================

            await adminAuth.setCustomUserClaims(
                uid,
                {
                    role: "employee"
                }
            );


            // ========================================
            // Create users Document
            // ========================================

            await adminDb
                .collection("users")
                .doc(uid)
                .set({

                    email,

                    role: "employee",

                    employeeId,

                    createdAt:
                        new Date().toISOString(),

                    createdBy:
                        decodedToken.uid
                });


            // ========================================
            // Create employees Document
            // ========================================

            await adminDb
                .collection("employees")
                .doc(uid)
                .set({

                    employeeId,

                    personalInformation: {

                        fullName:
                            fullName || "",

                        phoneNumber:
                            phoneNumber || "",

                        dateOfBirth:
                            dateOfBirth || "",

                        gender:
                            gender || "",

                        bloodGroup:
                            bloodGroup || ""
                    },


                    employmentInformation: {

                        department:
                            department || "",

                        designation:
                            designation || "",

                        joinDate:
                            joinDate || "",

                        employmentType:
                            employmentType || "",

                        workLocation:
                            workLocation || ""
                    },


                    address: {

                        addressLine1:
                            addressLine1 || "",

                        addressLine2:
                            addressLine2 || "",

                        city:
                            city || "",

                        state:
                            state || "",

                        country:
                            country || "",

                        postalCode:
                            postalCode || ""
                    },


                    emergencyContact: {

                        contactName:
                            contactName || "",

                        relationship:
                            relationship || "",

                        phoneNumber:
                            emergencyPhoneNumber || "",

                        email:
                            emergencyEmail || ""
                    },


                    createdAt:
                        new Date().toISOString(),

                    updatedAt:
                        new Date().toISOString(),

                    createdBy:
                        decodedToken.uid
                });

        } catch (firestoreError) {

            console.error(
                "Firestore creation failed. Rolling back Auth:",
                firestoreError
            );

            // Remove Auth account if Firestore creation fails
            try {
                await adminAuth.deleteUser(uid);
            } catch (rollbackError) {
                console.error(
                    "Auth rollback failed:",
                    rollbackError
                );
            }

            throw firestoreError;
        }


        // ========================================
        // Success
        // ========================================

        return res.status(201).json({

            success: true,

            message:
                "Employee created successfully.",

            employee: {

                uid,

                employeeId,

                email,

                fullName
            }
        });


    } catch (error) {

        console.error(
            "Create employee error:",
            error
        );


        // Firebase Auth errors

        if (
            error.code ===
            "auth/email-already-exists"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });
        }


        if (
            error.code ===
            "auth/invalid-email"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid email address."
            });
        }


        if (
            error.code ===
            "auth/weak-password"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Password is too weak."
            });
        }


        return res.status(500).json({
            success: false,
            message:
                "Unable to create employee."
        });
    }
}