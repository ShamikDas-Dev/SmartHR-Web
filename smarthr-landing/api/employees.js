import { adminAuth, adminDb } from "./firebaseAdmin.js";

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") {
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
        message: "Only HR can view employees",
      });
    }

    // -----------------------------
    // 3. Get employees
    // -----------------------------
    const employeesSnapshot = await adminDb
      .collection("employees")
      .get();

    const employees = [];

    // -----------------------------
    // 4. Convert Firestore data
    //    into dashboard format
    // -----------------------------
    for (const employeeDoc of employeesSnapshot.docs) {
      const data = employeeDoc.data();

      const uid = employeeDoc.id;

      // Get user information
      const userDoc = await adminDb
        .collection("users")
        .doc(uid)
        .get();

      const userData = userDoc.exists
        ? userDoc.data()
        : {};

      employees.push({
        id: uid,

        // Login / basic information
        employeeId: data.employeeId || "",
        name: data.personalInformation?.fullName || "",
        email: userData.email || "",

        // Personal Information
        phone:
          data.personalInformation?.phoneNumber || "",

        dob:
          data.personalInformation?.dateOfBirth || "",

        gender:
          data.personalInformation?.gender || "",

        bloodGroup:
          data.personalInformation?.bloodGroup || "",

        // Employment Information
        department:
          data.employmentInformation?.department || "",

        designation:
          data.employmentInformation?.designation || "",

        joinDate:
          data.employmentInformation?.joinDate || "",

        employmentType:
          data.employmentInformation?.employmentType || "",

        workLocation:
          data.employmentInformation?.workLocation || "",

        // Address
        address1:
          data.address?.addressLine1 || "",

        address2:
          data.address?.addressLine2 || "",

        city:
          data.address?.city || "",

        state:
          data.address?.state || "",

        country:
          data.address?.country || "",

        postalCode:
          data.address?.postalCode || "",

        // Emergency Contact
        emergencyName:
          data.emergencyContact?.contactName || "",

        emergencyRelation:
          data.emergencyContact?.relationship || "",

        emergencyPhone:
          data.emergencyContact?.phoneNumber || "",

        emergencyEmail:
          data.emergencyContact?.email || "",

        // Status
        status: data.status || "Active",

        // Timestamps
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    }

    // -----------------------------
    // 5. Send response
    // -----------------------------
    return res.status(200).json({
      success: true,
      employees,
    });

  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load employees",
    });
  }
}