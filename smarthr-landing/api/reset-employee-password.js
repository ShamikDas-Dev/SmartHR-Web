import { adminAuth, adminDb } from "../lib/firebaseAdmin.js";

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
        message: "Only HR can reset employee passwords",
      });
    }

    // -----------------------------
    // 3. Get request data
    // -----------------------------
    const { uid, password } = req.body;

    // -----------------------------
    // 4. Validate data
    // -----------------------------
    if (!uid || !password) {
      return res.status(400).json({
        success: false,
        message: "Employee UID and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // -----------------------------
    // 5. Check employee exists
    // -----------------------------
    const employeeDoc = await adminDb
      .collection("employees")
      .doc(uid)
      .get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // -----------------------------
    // 6. Get Firebase Auth user
    // -----------------------------
    try {
      await adminAuth.getUser(uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return res.status(404).json({
          success: false,
          message: "Employee account not found",
        });
      }

      throw error;
    }

    // -----------------------------
    // 7. Update password
    // -----------------------------
    await adminAuth.updateUser(uid, {
      password,
    });

    // -----------------------------
    // 8. Update timestamp
    // -----------------------------
    await adminDb
      .collection("employees")
      .doc(uid)
      .set(
        {
          updatedAt: new Date().toISOString(),
        },
        {
          merge: true,
        }
      );

    // -----------------------------
    // 9. Success
    // -----------------------------
    return res.status(200).json({
      success: true,
      message: "Employee password reset successfully",
    });

  } catch (error) {
    console.error(
      "Reset employee password error:",
      error
    );

    if (error.code === "auth/weak-password") {
      return res.status(400).json({
        success: false,
        message: "Password is too weak",
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
      message: "Failed to reset employee password",
    });
  }
}