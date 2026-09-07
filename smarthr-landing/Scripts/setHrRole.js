const uids = [
    "tF1OddWYTbUggtNwkCpWQI00HE92",
    "jhkZmsLhWsakazJD7gxVblsHm842"
];

async function setHRRole() {
    try {
        for (const uid of uids) {
            await auth.setCustomUserClaims(uid, {
                role: "hr"
            });

            console.log(`HR role assigned to UID: ${uid}`);
        }

        console.log("Both users are now HR.");
    } catch (error) {
        console.error("Failed to assign HR role:");
        console.error(error);
    }
}

setHRRole();