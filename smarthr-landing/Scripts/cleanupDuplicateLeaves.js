import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ============================================================
// FIREBASE ADMIN INITIALIZATION
// ============================================================

const privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const adminApp =
    getApps().length === 0
        ? initializeApp({
              credential: cert({
                  projectId:
                      process.env.FIREBASE_PROJECT_ID,

                  clientEmail:
                      process.env.FIREBASE_CLIENT_EMAIL,

                  privateKey
              })
          })
        : getApps()[0];

const db =
    getFirestore(adminApp);


// ============================================================
// NORMALIZE REASON
// ============================================================

function normalizeReason(reason) {
    return String(reason || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


// ============================================================
// CREATE DUPLICATE KEY
// ============================================================

function createDuplicateKey(data) {
    return [
        data.employeeId || "",
        data.leaveType || "",
        data.startDate || "",
        data.endDate || "",
        normalizeReason(data.reason)
    ].join("|");
}


// ============================================================
// MAIN CLEANUP
// ============================================================

async function cleanupDuplicateLeaves() {

    console.log(
        "Starting duplicate leave request cleanup..."
    );

    const snapshot =
        await db
            .collection("leaveRequests")
            .get();

    console.log(
        `Found ${snapshot.size} leave request documents.`
    );

    const groups = new Map();

    // --------------------------------------------------------
    // GROUP DOCUMENTS
    // --------------------------------------------------------

    snapshot.forEach((doc) => {

        const data = doc.data();

        const key =
            createDuplicateKey(data);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups
            .get(key)
            .push({
                id: doc.id,
                ...data
            });
    });


    // --------------------------------------------------------
    // FIND DUPLICATES
    // --------------------------------------------------------

    const documentsToDelete = [];

    for (const [key, requests] of groups) {

        if (requests.length <= 1) {
            continue;
        }

        /*
         * Sort newest first.
         *
         * ISO timestamps sort correctly
         * using localeCompare().
         */

        requests.sort((a, b) => {

            const dateA =
                a.createdAt || "";

            const dateB =
                b.createdAt || "";

            return dateB.localeCompare(dateA);
        });

        // Keep newest
        const newest = requests[0];

        // Delete older copies
        const duplicates =
            requests.slice(1);

        console.log("\nDuplicate group found:");

        console.log(
            `Employee: ${newest.employeeId}`
        );

        console.log(
            `Leave: ${newest.leaveType}`
        );

        console.log(
            `Dates: ${newest.startDate} -> ${newest.endDate}`
        );

        console.log(
            `Keeping: ${newest.id}`
        );

        console.log(
            `Deleting: ${duplicates.length} duplicate(s)`
        );

        for (const duplicate of duplicates) {

            console.log(
                `  - ${duplicate.id}`
            );

            documentsToDelete.push(
                duplicate.id
            );
        }
    }


    // --------------------------------------------------------
    // NOTHING TO DELETE
    // --------------------------------------------------------

    if (documentsToDelete.length === 0) {

        console.log(
            "\nNo duplicate leave requests found."
        );

        return;
    }


    // --------------------------------------------------------
    // DELETE IN BATCHES
    // --------------------------------------------------------

    console.log(
        `\nDeleting ${documentsToDelete.length} duplicate documents...`
    );

    const batchSize = 500;

    for (
        let i = 0;
        i < documentsToDelete.length;
        i += batchSize
    ) {

        const batch =
            db.batch();

        const currentBatch =
            documentsToDelete.slice(
                i,
                i + batchSize
            );

        for (
            const documentId of currentBatch
        ) {

            const ref =
                db
                    .collection("leaveRequests")
                    .doc(documentId);

            batch.delete(ref);
        }

        await batch.commit();

        console.log(
            `Deleted batch ${
                Math.floor(i / batchSize) + 1
            }`
        );
    }


    // --------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------

    console.log("\nCleanup completed.");

    console.log(
        `Original documents: ${snapshot.size}`
    );

    console.log(
        `Deleted duplicates: ${documentsToDelete.length}`
    );

    console.log(
        `Remaining documents: ${
            snapshot.size -
            documentsToDelete.length
        }`
    );
}


// ============================================================
// RUN SCRIPT
// ============================================================

cleanupDuplicateLeaves()
    .then(() => {
        console.log(
            "\nDone."
        );

        process.exit(0);
    })
    .catch((error) => {

        console.error(
            "\nCleanup failed:"
        );

        console.error(error);

        process.exit(1);
    });