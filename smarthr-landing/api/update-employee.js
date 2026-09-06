import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // -----------------------------
    // 1. Check authentication
    // -----------------------------
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // -----------------------------
    // 2. Check HR role
    // -----------------------------
    if (
      decodedToken.role !== "hr" &&
      decodedToken.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only HR can update employees",
      });
    }

    // -----------------------------
    // 3. Get employee data
    // -----------------------------
    const {
      uid,
      email,
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
      emergencyEmail,
    } = req.body;

    // -----------------------------
    // 4. Validate required fields
    // -----------------------------
    if (!uid || !email || !fullName) {
      return res.status(400).json({
        success: false,
        message: "UID, email and full name are required",
      });
    }

    // -----------------------------
    // 5. Check employee exists
    // -----------------------------
    const employeeRef = adminDb
      .collection("employees")
      .doc(uid);

    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // -----------------------------
    // 6. Get old Auth information
    //    for rollback if needed
    // -----------------------------
    const existingUser = await adminAuth.getUser(uid);

    const oldEmail = existingUser.email;
    const oldDisplayName = existingUser.displayName;

    // -----------------------------
    // 7. Update Firebase Auth
    // -----------------------------
    await adminAuth.updateUser(uid, {
      email,
      displayName: fullName,
    });

    try {
      // -----------------------------
      // 8. Update users collection
      // -----------------------------
      await adminDb
        .collection("users")
        .doc(uid)
        .set(
          {
            email,
            role: "employee",
            employeeId: employeeId || null,
            updatedAt: new Date().toISOString(),
          },
          {
            merge: true,
          }
        );

      // -----------------------------
      // 9. Update employees collection
      // -----------------------------
      await employeeRef.set(
        {
          employeeId: employeeId || null,

          personalInformation: {
            fullName,
            phoneNumber: phoneNumber || "",
            dateOfBirth: dateOfBirth || "",
            gender: gender || "",
            bloodGroup: bloodGroup || "",
          },

          employmentInformation: {
            department: department || "",
            designation: designation || "",
            joinDate: joinDate || "",
            employmentType: employmentType || "",
            workLocation: workLocation || "",
          },

          address: {
            addressLine1: addressLine1 || "",
            addressLine2: addressLine2 || "",
            city: city || "",
            state: state || "",
            country: country || "",
            postalCode: postalCode || "",
          },

          emergencyContact: {
            contactName: contactName || "",
            relationship: relationship || "",
            phoneNumber: emergencyPhoneNumber || "",
            email: emergencyEmail || "",
          },

          updatedAt: new Date().toISOString(),
        },
        {
          merge: true,
        }
      );

    } catch (firestoreError) {
      // -----------------------------
      // 10. Rollback Auth if
      //     Firestore update fails
      // -----------------------------
      console.error(
        "Firestore update failed. Rolling back Auth:",
        firestoreError
      );

      try {
        await adminAuth.updateUser(uid, {
          email: oldEmail,
          displayName: oldDisplayName,
        });
      } catch (rollbackError) {
        console.error(
          "Auth rollback failed:",
          rollbackError
        );
      }

      throw firestoreError;
    }

    // -----------------------------
    // 11. Success
    // -----------------------------
    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: {
        uid,
        email,
        employeeId: employeeId || null,
      },
    });

  } catch (error) {
    console.error("Update employee error:", error);

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    if (error.code === "auth/invalid-email") {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "Employee account not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
    });
  }
}