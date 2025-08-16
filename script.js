// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, deleteDoc, query, where, Timestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Handle Google redirect results
getRedirectResult(auth).catch((error) => {
    if (error) {
        console.error('Google login error:', error);
        alert(`Google login failed: ${error.message}`);
    }
});

// UI Elements
const authContainer = document.getElementById('auth-container');
const signupContainer = document.getElementById('signup-container');
const appContainer = document.getElementById('app-container');
const googleLoginButton = document.getElementById('google-login');
const googleSignupButton = document.getElementById('google-signup');
const emailPasswordLoginForm = document.getElementById('email-password-login');
const emailPasswordSignupForm = document.getElementById('email-password-signup');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const logoutButton = document.getElementById('logout');
const userEmailElement = document.getElementById('user-email');
const calendarInput = document.getElementById('calendar');
const reflectionsList = document.getElementById('reflections-list');
const showAllButton = document.getElementById('show-all');
const aiFeedback = document.getElementById('ai-feedback');

let viewAll = false;

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

// Google Login/Signup
async function handleGoogleAuth() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            try {
                await signInWithRedirect(auth, provider);
            } catch (redirectError) {
                handleGoogleError(redirectError);
            }
        } else {
            handleGoogleError(error);
        }
    }
}

function handleGoogleError(error) {
    console.error('Google login error:', error);
    if (error.code === 'auth/unauthorized-domain') {
        const host = window.location.host;
        alert(`Google login failed: unauthorized domain. Please add ${host} to your Firebase console.`);
    } else {
        alert(`Google login failed: ${error.message}`);
    }
}

googleLoginButton.addEventListener('click', handleGoogleAuth);
if (googleSignupButton) {
    googleSignupButton.addEventListener('click', handleGoogleAuth);
}

// Email/Password Signup
emailPasswordSignupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('Signed up:', auth.currentUser);
    } catch (error) {
        console.error('Signup error:', error.message);
        alert(`Signup failed: ${error.message}`);
    }
});

// Email/Password Login
emailPasswordLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Logged in:', auth.currentUser);
    } catch (error) {
        console.error('Login error:', error.message);
        alert(`Login failed: ${error.message}`);
    }
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

function getMillis(timestamp) {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 0 : date.getTime();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        authContainer.style.display = 'none';
        signupContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userEmailElement.textContent = user.email;

        // Set calendar to today and set up listener
        viewAll = false;
        calendarInput.style.display = 'block';
        showAllButton.textContent = 'Show All';
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
        where("userId", "==", user.uid)
    );

    unsubscribeFromReflections = onSnapshot(q, (querySnapshot) => {
        reflectionsList.innerHTML = '';
        const dayDocs = querySnapshot.docs
            .filter(doc => {
                const createdAtMillis = getMillis(doc.data().createdAt);
                return createdAtMillis >= startTimestamp.toMillis() &&
                       createdAtMillis <= endTimestamp.toMillis();
            })
            .sort((a, b) => getMillis(b.data().createdAt) - getMillis(a.data().createdAt));

        if (dayDocs.length === 0) {
            reflectionsList.innerHTML = '<p>No reflections for this day.</p>';
        } else {
            dayDocs.forEach(renderReflectionDoc);
        }
    }, (error) => {
        console.error("Error with reflections listener: ", error);
        reflectionsList.innerHTML = '<p>Error loading reflections.</p>';
    });
}

calendarInput.addEventListener('change', () => {
    const dateParts = calendarInput.value.split('-').map(part => parseInt(part, 10));
    const selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    if (selectedDate && !viewAll) {
        setupReflectionsListener(selectedDate);
    }
});


function setupAllReflectionsListener() {
    const user = auth.currentUser;
    if (!user) return;

    if (unsubscribeFromReflections) {
        unsubscribeFromReflections();
    }

    reflectionsList.innerHTML = 'Loading...';

    const q = query(
        collection(db, "reflections"),
        where("userId", "==", user.uid)
    );

    unsubscribeFromReflections = onSnapshot(q, (querySnapshot) => {
        reflectionsList.innerHTML = '';
        const docs = querySnapshot.docs
            .sort((a, b) => getMillis(b.data().createdAt) - getMillis(a.data().createdAt));

        if (docs.length === 0) {
            reflectionsList.innerHTML = '<p>No reflections found.</p>';
        } else {
            docs.forEach(renderReflectionDoc);
        }
    }, (error) => {
        console.error("Error with reflections listener: ", error);
        reflectionsList.innerHTML = '<p>Error loading reflections.</p>';
    });
}

function renderReflectionDoc(doc) {
    const reflection = doc.data();
    const reflectionEl = document.createElement('div');
    const rawCreatedAt = reflection.createdAt;
    const tempDate = rawCreatedAt?.toDate ? rawCreatedAt.toDate() : new Date(rawCreatedAt);
    const createdAtDate = isNaN(tempDate.getTime()) ? new Date() : tempDate;

    reflectionEl.classList.add('reflection-card');
    reflectionEl.innerHTML = `
        <button class="delete-reflection" data-id="${doc.id}" title="Delete">&times;</button>

        <h3>Reflection from ${createdAtDate.toLocaleDateString()} at ${createdAtDate.toLocaleTimeString()}</h3>
        <p><strong>What did I do well today?</strong><br>${reflection.didWell}</p>
        <p><strong>What did I do poorly today?</strong><br>${reflection.didPoorly}</p>
        <p><strong>What will I improve tomorrow?</strong><br>${reflection.improveTomorrow}</p>
    `;
    reflectionsList.appendChild(reflectionEl);
}

showAllButton.addEventListener('click', () => {
    viewAll = !viewAll;
    if (viewAll) {
        calendarInput.style.display = 'none';
        showAllButton.textContent = 'Show by Date';
        setupAllReflectionsListener();
    } else {
        calendarInput.style.display = 'block';
        showAllButton.textContent = 'Show All';
        const dateParts = calendarInput.value.split('-').map(part => parseInt(part, 10));
        const selectedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        setupReflectionsListener(selectedDate);
    }
});

// Reflection Form
const reflectionForm = document.getElementById('daily-reflection');
reflectionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const didWell = document.getElementById('didWell').value;
    const didPoorly = document.getElementById('didPoorly').value;
    const improveTomorrow = document.getElementById('improveTomorrow').value;
    const user = auth.currentUser;

    if (user) {
            addDoc(collection(db, "reflections"), {
                userId: user.uid,
                didWell,
                didPoorly,
                improveTomorrow,
                createdAt: Timestamp.now()
            }).then(() => {
                console.log("Reflection saved!");
                reflectionForm.reset();
                showFeedback(didWell, didPoorly, improveTomorrow);
                // No need to manually reload, onSnapshot will do it automatically
            }).catch((error) => {
                console.error("Error adding document: ", error);
                alert('Failed to save reflection.');
            });
        }
});

reflectionsList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-reflection')) {
        const id = e.target.dataset.id;
        if (confirm('Delete this reflection?')) {
            try {
                await deleteDoc(doc(db, 'reflections', id));
            } catch (error) {
                console.error('Delete error:', error);
                alert('Failed to delete reflection.');
            }
        }
    }
});

function showFeedback(didWell, didPoorly, improveTomorrow) {
    aiFeedback.innerHTML = `
        <h3>AI Feedback</h3>
        <p><strong>Did well:</strong> ${didWell}</p>
        <p><strong>Did poorly:</strong> ${didPoorly}</p>
        <p><strong>Improve tomorrow:</strong> ${improveTomorrow}</p>
    `;
    aiFeedback.style.display = 'block';
    aiFeedback.scrollIntoView({ behavior: 'smooth' });
}
