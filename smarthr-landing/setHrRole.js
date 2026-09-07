const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const dotenv = require("dotenv");

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

const uids = [
    "tF1OddWYTbUggtNwkCpWQI00HE92",
    "jhkZmsLhWsakazJD7gxVblsHm842"
];

async function setHRRole() {
    try {
        for (const uid of uids) {
            await auth.setCustomUserClaims(uid, {
                role: "hr",
            });

            console.log("HR role assigned to:", uid);
        }

        console.log("Both HR users now have the HR role.");
    } catch (error) {
        console.error("Failed to assign HR role:");
        console.error(error);
    }
}

setHRRole();