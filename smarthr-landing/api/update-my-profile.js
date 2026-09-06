import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // ==========================================
    // 1. Check authentication
    // ==========================================

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;


    // ==========================================
    // 2. Check that the user is an employee
    // ==========================================

    if (decodedToken.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Only employees can use this endpoint",
      });
    }


    // ==========================================
    // 3. Get employee data from request
    // ==========================================

    const {
      phoneNumber,
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


    // ==========================================
    // 4. Check employee exists
    // ==========================================

    const employeeRef = adminDb
      .collection("employees")
      .doc(uid);

    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }


    // ==========================================
    // 5. Update ONLY allowed fields
    // ==========================================

    await employeeRef.set(
      {
        personalInformation: {
          phoneNumber: phoneNumber || "",
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


    // ==========================================
    // 6. Success
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });

  } catch (error) {
    console.error("Update employee profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
}