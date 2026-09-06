import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      })
    : getApps()[0];

const auth = getAuth(app);

const uid = "tF1OddWYTbUggtNwkCpWQI00HE92";

async function setHRRole() {
  try {
    await auth.setCustomUserClaims(uid, {
      role: "hr",
    });

    console.log("HR role successfully assigned.");
    console.log("UID:", uid);
    console.log("Role: hr");
  } catch (error) {
    console.error("Failed to assign HR role:");
    console.error(error);
  }
}

setHRRole();