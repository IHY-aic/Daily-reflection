// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// UI Elements
const authContainer = document.getElementById('auth-container');
const signupContainer = document.getElementById('signup-container');
const appContainer = document.getElementById('app-container');
const googleLoginButton = document.getElementById('google-login');
const emailPasswordLoginForm = document.getElementById('email-password-login');
const emailPasswordSignupForm = document.getElementById('email-password-signup');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const logoutButton = document.getElementById('logout');
const userEmailElement = document.getElementById('user-email');

// Show/Hide signup form
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    authContainer.style.display = 'none';
    signupContainer.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupContainer.style.display = 'none';
    authContainer.style.display = 'block';
});

// Google Login
googleLoginButton.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log('Logged in with Google:', user);
        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.error('Google login error:', errorMessage);
        });
});

// Email/Password Signup
emailPasswordSignupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('Signed up:', user);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Signup error:', errorMessage);
            alert(`Signup failed: ${errorMessage}`);
        });
});

// Email/Password Login
emailPasswordLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('Logged in:', user);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Login error:', errorMessage);
            alert(`Login failed: ${errorMessage}`);
        });
});


// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log('Logged out');
    }).catch((error) => {
        console.error('Logout error:', error);
    });
});

// Auth State Observer
let unsubscribeFromReflections = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        authContainer.style.display = 'none';
        signupContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userEmailElement.textContent = user.email;

        // Set calendar to today and set up listener
        const today = new Date();
        calendarInput.value = today.toISOString().split('T')[0];
        setupReflectionsListener(today);

    } else {
        // User is signed out
        authContainer.style.display = 'block';
        signupContainer.style.display = 'none';
        appContainer.style.display = 'none';
        userEmailElement.textContent = '';
        // Unsubscribe from the listener when logged out
        if (unsubscribeFromReflections) {
            unsubscribeFromReflections();
        }
    }
});

const calendarInput = document.getElementById('calendar');
const reflectionsList = document.getElementById('reflections-list');

// Set up a real-time listener for reflections
function setupReflectionsListener(date) {
    const user = auth.currentUser;
    if (!user) return;

    // Unsubscribe from the old listener if it exists
    if (unsubscribeFromReflections) {
        unsubscribeFromReflections();
    }

    reflectionsList.innerHTML = 'Loading...';

    // Calculate start and end of the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    const q = query(
        collection(db, "reflections"),
        where("userId", "==", user.uid),
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp)
    );

    unsubscribeFromReflections = onSnapshot(q, (querySnapshot) => {
        reflectionsList.innerHTML = '';
        if (querySnapshot.empty) {
            reflectionsList.innerHTML = '<p>No reflections for this day.</p>';
        } else {
            querySnapshot.docs.sort((a, b) => b.data().createdAt - a.data().createdAt).forEach((doc) => {
                const reflection = doc.data();
                const reflectionEl = document.createElement('div');
                const createdAtDate = reflection.createdAt.toDate();

                reflectionEl.innerHTML = `
                    <h3>Reflection from ${createdAtDate.toLocaleDateString()} at ${createdAtDate.toLocaleTimeString()}</h3>
                    <p><strong>What did I do well today?</strong><br>${reflection.q1}</p>
                    <p><strong>What did I do poorly today?</strong><br>${reflection.q2}</p>
                    <p><strong>What will I improve tomorrow?</strong><br>${reflection.q3}</p>
                `;
                reflectionsList.appendChild(reflectionEl);
            });
        }
    }, (error) => {
        console.error("Error with reflections listener: ", error);
        reflectionsList.innerHTML = '<p>Error loading reflections.</p>';
    });
}

calendarInput.addEventListener('change', () => {
    const dateParts = calendarInput.value.split('-').map(part => parseInt(part, 10));
    const selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    if (selectedDate) {
        setupReflectionsListener(selectedDate);
    }
});


// Reflection Form
const reflectionForm = document.getElementById('daily-reflection');
reflectionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const q1 = document.getElementById('q1').value;
    const q2 = document.getElementById('q2').value;
    const q3 = document.getElementById('q3').value;
    const user = auth.currentUser;

    if (user) {
        addDoc(collection(db, "reflections"), {
            userId: user.uid,
            q1: q1,
            q2: q2,
            q3: q3,
            createdAt: Timestamp.now()
        }).then(() => {
            console.log("Reflection saved!");
            reflectionForm.reset();
            // No need to manually reload, onSnapshot will do it automatically
        }).catch((error) => {
            console.error("Error adding document: ", error);
        });
    }
});
