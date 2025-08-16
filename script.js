// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, deleteDoc, query, where, Timestamp, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
const downloadButton = document.getElementById('download-reflections');
const paginationDiv = document.getElementById('pagination');

// Gemini API Key injected via repository secret GEMINI_API_KEY
const GEMINI_API_KEY = window.GEMINI_API_KEY || '';

let viewAll = false;
let allReflections = [];
let currentPage = 1;
const perPage = 10;

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
    paginationDiv.innerHTML = '';

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
        allReflections = querySnapshot.docs
            .sort((a, b) => getMillis(b.data().createdAt) - getMillis(a.data().createdAt));
        if (allReflections.length === 0) {
            reflectionsList.innerHTML = '<p>No reflections found.</p>';
            paginationDiv.innerHTML = '';
        } else {
            renderPage(1);
        }
    }, (error) => {
        console.error("Error with reflections listener: ", error);
        reflectionsList.innerHTML = '<p>Error loading reflections.</p>';
    });
}

function renderReflectionDoc(docSnap) {
    const reflection = docSnap.data();
    const reflectionEl = document.createElement('div');
    const rawCreatedAt = reflection.createdAt;
    const tempDate = rawCreatedAt?.toDate ? rawCreatedAt.toDate() : new Date(rawCreatedAt);
    const createdAtDate = isNaN(tempDate.getTime()) ? new Date() : tempDate;

    reflectionEl.classList.add('reflection-card');
    reflectionEl.innerHTML = `
        <button class="delete-reflection" data-id="${docSnap.id}" title="Delete">&times;</button>
        <h3>Reflection from ${createdAtDate.toLocaleDateString()} at ${createdAtDate.toLocaleTimeString()}</h3>
        <p><strong>What did I do well today?</strong><br>${reflection.didWell}</p>
        <p><strong>What did I do poorly today?</strong><br>${reflection.didPoorly}</p>
        <p><strong>What will I improve tomorrow?</strong><br>${reflection.improveTomorrow}</p>
    `;
    reflectionsList.appendChild(reflectionEl);
}

function renderPage(page) {
    currentPage = page;
    reflectionsList.innerHTML = '';
    const start = (page - 1) * perPage;
    const pageDocs = allReflections.slice(start, start + perPage);
    pageDocs.forEach(renderReflectionDoc);
    renderPagination();
}

function renderPagination() {
    paginationDiv.innerHTML = '';
    const totalPages = Math.ceil(allReflections.length / perPage);
    if (totalPages <= 1) return;
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.addEventListener('click', () => renderPage(i));
        paginationDiv.appendChild(btn);
    }
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
        paginationDiv.innerHTML = '';
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
            }).then(async () => {
                console.log("Reflection saved!");
                reflectionForm.reset();
                const feedback = await fetchGeminiFeedback(didWell, didPoorly, improveTomorrow);
                localStorage.setItem('latestReflection', JSON.stringify({ didWell, didPoorly, improveTomorrow, feedback }));
                window.location.href = 'summary.html';
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

downloadButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const q = query(collection(db, 'reflections'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(snap => {
            const d = snap.data();
            return {
                didWell: d.didWell,
                didPoorly: d.didPoorly,
                improveTomorrow: d.improveTomorrow,
                createdAt: new Date(getMillis(d.createdAt)).toISOString()
            };
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reflections.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download reflections.');
    }
});

async function fetchGeminiFeedback(didWell, didPoorly, improveTomorrow) {
    if (!GEMINI_API_KEY) {
        return 'No API key configured for AI feedback.';
    }
    const prompt = `Today's reflection:\n- Did well: ${didWell}\n- Did poorly: ${didPoorly}\n- Improve tomorrow: ${improveTomorrow}\nProvide encouraging feedback.`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: prompt }] }
                ]
            })
        });
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No feedback generated.';
    } catch (error) {
        console.error('Gemini API error:', error);
        return 'Failed to fetch AI feedback.';
    }
}
