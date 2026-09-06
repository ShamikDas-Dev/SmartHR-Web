import {
    auth,
    db,
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    doc,
    getDoc
} from "./firebase/config.js";


// =====================================================
// Detect Current Page
// =====================================================

const currentPath = window.location.pathname;


// =====================================================
// Employee Login
// =====================================================

const employeeLoginForm =
    document.getElementById("employeeLoginForm");

if (employeeLoginForm) {

    employeeLoginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const rememberMe = document.getElementById("rememberMe");

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage(
                "Please enter your email and password.",
                "error"
            );
            return;
        }

        const submitButton =
            employeeLoginForm.querySelector(".submit-btn");

        const buttonText =
            submitButton?.querySelector("span");

        const originalText =
            buttonText?.textContent || "Login to Portal";


        // Disable button
        if (submitButton) {
            submitButton.disabled = true;
        }

        if (buttonText) {
            buttonText.textContent = "Signing in...";
        }


        try {

            // ==========================================
            // Remember Me
            // ==========================================

            await setPersistence(
                auth,
                rememberMe?.checked
                    ? browserLocalPersistence
                    : browserSessionPersistence
            );


            // ==========================================
            // Firebase Login
            // ==========================================

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;


            // ==========================================
            // Get User Information From Firestore
            // ==========================================

            const userRef =
                doc(db, "users", user.uid);

            const userSnapshot =
                await getDoc(userRef);


            if (!userSnapshot.exists()) {

                await signOut(auth);

                throw new Error(
                    "Your account exists, but your SmartHR profile was not found."
                );
            }


            const userData =
                userSnapshot.data();


            // ==========================================
            // Check Employee Role
            // ==========================================

            if (userData.role !== "employee") {

                await signOut(auth);

                throw new Error(
                    "This account is not registered as an employee account."
                );
            }


            // ==========================================
            // Successful Login
            // ==========================================

            showMessage(
                "Login successful. Redirecting...",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "./dashboard/employee-dashboard.html";

            }, 700);


        } catch (error) {

            console.error(
                "Employee login error:",
                error
            );


            let message =
                "Unable to login. Please try again.";


            switch (error.code) {

                case "auth/invalid-email":
                    message =
                        "Please enter a valid email address.";
                    break;

                case "auth/user-not-found":
                    message =
                        "No account was found with this email.";
                    break;

                case "auth/wrong-password":
                    message =
                        "Incorrect email or password.";
                    break;

                case "auth/invalid-credential":
                    message =
                        "Incorrect email or password.";
                    break;

                case "auth/user-disabled":
                    message =
                        "This account has been disabled. Contact HR.";
                    break;

                case "auth/too-many-requests":
                    message =
                        "Too many login attempts. Try again later.";
                    break;

                default:

                    if (error.message) {
                        message = error.message;
                    }
            }


            showMessage(
                message,
                "error"
            );


            // Enable button again
            if (submitButton) {
                submitButton.disabled = false;
            }

            if (buttonText) {
                buttonText.textContent = originalText;
            }
        }

    });
}


// ============================================================
// HR LOGIN
// ============================================================

const hrLoginForm = document.getElementById("hrLoginForm");

if (hrLoginForm) {
    hrLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document
            .getElementById("hrEmail")
            .value
            .trim();

        const password = document
            .getElementById("hrPassword")
            .value;

        // Create message element if it doesn't exist
        let message = document.getElementById("message");

        if (!message) {
            message = document.createElement("div");
            message.id = "message";
            message.style.marginTop = "15px";
            hrLoginForm.appendChild(message);
        }

        if (!email || !password) {
            message.style.color = "#dc2626";
            message.textContent =
                "Please enter your email and password.";
            return;
        }

        message.style.color = "#6366f1";
        message.textContent = "Signing in...";

        try {
            // Firebase login
            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            console.log("HR login Firebase UID:", user.uid);

            // Get fresh ID token so custom claims are available
            const tokenResult =
                await user.getIdTokenResult(true);

            console.log(
                "Firebase claims:",
                tokenResult.claims
            );

            // Check HR role
            const role = tokenResult.claims.role;

            if (role !== "hr" && role !== "admin") {
                await signOut(auth);

                message.style.color = "#dc2626";
                message.textContent =
                    "You do not have HR access.";

                return;
            }

            message.style.color = "#16a34a";
            message.textContent =
                "Login successful!";

            // Redirect to HR dashboard
            setTimeout(() => {
                window.location.href =
                    "/src/pages/dashboard/hr-dashboard.html";
            }, 500);

        } catch (error) {
            console.error("HR login error:", error);

            message.style.color = "#dc2626";

            switch (error.code) {
                case "auth/invalid-credential":
                case "auth/wrong-password":
                case "auth/user-not-found":
                    message.textContent =
                        "Incorrect email or password.";
                    break;

                case "auth/invalid-email":
                    message.textContent =
                        "Please enter a valid email address.";
                    break;

                case "auth/too-many-requests":
                    message.textContent =
                        "Too many attempts. Please try again later.";
                    break;

                default:
                    message.textContent =
                        error.message ||
                        "Login failed. Please try again.";
            }
        }
    });
}

// =====================================================
// Message Function
// =====================================================

function showMessage(message, type) {

    const form =
        document.getElementById("employeeLoginForm") ||
        document.getElementById("hrLoginForm");


    if (!form) {
        return;
    }


    let messageElement =
        document.getElementById("loginMessage");


    if (!messageElement) {

        messageElement =
            document.createElement("div");

        messageElement.id =
            "loginMessage";

        messageElement.style.marginTop =
            "14px";

        messageElement.style.padding =
            "12px 14px";

        messageElement.style.borderRadius =
            "10px";

        messageElement.style.fontSize =
            "14px";

        messageElement.style.textAlign =
            "center";

        form.appendChild(messageElement);
    }


    messageElement.textContent =
        message;


    if (type === "error") {

        messageElement.style.background =
            "rgba(239, 68, 68, 0.10)";

        messageElement.style.border =
            "1px solid rgba(239, 68, 68, 0.25)";

        messageElement.style.color =
            "#fca5a5";

    } else {

        messageElement.style.background =
            "rgba(34, 197, 94, 0.10)";

        messageElement.style.border =
            "1px solid rgba(34, 197, 94, 0.25)";

        messageElement.style.color =
            "#86efac";
    }
}