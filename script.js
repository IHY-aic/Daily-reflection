// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, deleteDoc, Timestamp, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig, geminiApiKey } from './firebaseConfig.js';

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
const loadingContainer = document.getElementById('loading');
const googleLoginButton = document.getElementById('google-login');
const googleSignupButton = document.getElementById('google-signup');
const emailPasswordLoginForm = document.getElementById('email-password-login');
const emailPasswordSignupForm = document.getElementById('email-password-signup');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const logoutButton = document.getElementById('logout');
const userEmailElement = document.getElementById('user-email');
const calendarContainer = document.getElementById('calendar-container');
const calendarGrid = document.getElementById('calendar-grid');
const monthLabel = document.getElementById('month-label');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const reflectionsList = document.getElementById('reflections-list');
const showAllButton = document.getElementById('show-all');
const downloadButton = document.getElementById('download-reflections');
const downloadFormatSelect = document.getElementById('download-format');
const paginationDiv = document.getElementById('pagination');

// Gemini API Key injected via secret or taken from firebaseConfig.js
const GEMINI_API_KEY =
    (window.GEMINI_API_KEY && window.GEMINI_API_KEY !== '{{ GEMINI_API_KEY }}')
        ? window.GEMINI_API_KEY
        : (geminiApiKey || '');

let viewAll = false;
let allReflections = [];
let currentPage = 1;
const perPage = 10;
let selectedDate = new Date();
let displayedDate = new Date();

function renderCalendar() {
    if (!calendarGrid || !monthLabel) return;
    calendarGrid.innerHTML = '';
    const year = displayedDate.getFullYear();
    const month = displayedDate.getMonth();
    monthLabel.textContent = displayedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    weekdayNames.forEach(w => {
        const cell = document.createElement('div');
        cell.textContent = w;
        cell.className = 'weekday';
        calendarGrid.appendChild(cell);
    });
    for (let i = 0; i < startingDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.textContent = day;
        cell.className = 'calendar-day';
        const cellDate = new Date(year, month, day);
        if (selectedDate.toDateString() === cellDate.toDateString()) {
            cell.classList.add('selected');
        }
        cell.addEventListener('click', () => {
            selectedDate = cellDate;
            renderCalendar();
            if (!viewAll) setupReflectionsListener(selectedDate);
        });
        calendarGrid.appendChild(cell);
    }
}

if (prevMonthBtn && nextMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        displayedDate.setMonth(displayedDate.getMonth() - 1);
        selectedDate = new Date(displayedDate);
        renderCalendar();
        if (!viewAll) setupReflectionsListener(selectedDate);
    });
    nextMonthBtn.addEventListener('click', () => {
        displayedDate.setMonth(displayedDate.getMonth() + 1);
        selectedDate = new Date(displayedDate);
        renderCalendar();
        if (!viewAll) setupReflectionsListener(selectedDate);
    });
}

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
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (user) {
        // User is signed in
        authContainer.style.display = 'none';
        signupContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userEmailElement.textContent = user.email;

        if (calendarGrid && showAllButton && reflectionsList) {
            viewAll = false;
            showAllButton.textContent = 'Show All';
            selectedDate = new Date();
            displayedDate = new Date();
            renderCalendar();
            setupReflectionsListener(selectedDate);
        }

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
    if (!user || !reflectionsList || !paginationDiv) return;

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

    const reflectionsRef = collection(db, 'users', user.uid, 'reflections');

    unsubscribeFromReflections = onSnapshot(reflectionsRef, (querySnapshot) => {
        reflectionsList.innerHTML = '';
        const dayDocs = querySnapshot.docs
            .filter((docSnap) => {
                const createdAt = docSnap.data().createdAt;
                const millis = getMillis(createdAt);
                return millis >= startTimestamp.toMillis() && millis <= endTimestamp.toMillis();
            })
            .sort((a, b) => getMillis(b.data().createdAt) - getMillis(a.data().createdAt));
        if (dayDocs.length === 0) {
            reflectionsList.innerHTML = '<p>No reflections for this day.</p>';
        } else {
            dayDocs.forEach(renderReflectionDoc);
        }
    }, (error) => {
        console.error("Error with reflections listener: ", error);
        reflectionsList.innerHTML = `<p>Error loading reflections: ${error.message}</p>`;
    });
}




function setupAllReflectionsListener() {
    const user = auth.currentUser;
    if (!user || !reflectionsList) return;

    if (unsubscribeFromReflections) {
        unsubscribeFromReflections();
    }
    reflectionsList.innerHTML = 'Loading...';

    const reflectionsRef = collection(db, 'users', user.uid, 'reflections');

    unsubscribeFromReflections = onSnapshot(reflectionsRef, (querySnapshot) => {
        allReflections = querySnapshot.docs.sort((a, b) => getMillis(b.data().createdAt) - getMillis(a.data().createdAt));
        if (allReflections.length === 0) {
            reflectionsList.innerHTML = '<p>No reflections found.</p>';
            paginationDiv.innerHTML = '';
        } else {
            renderPage(1);
        }
    }, (error) => {
        console.error("Error with reflections listener: ", error);
        reflectionsList.innerHTML = `<p>Error loading reflections: ${error.message}</p>`;
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
        ${reflection.feedback ? `<p><strong>AI Feedback:</strong><br>${reflection.feedback}</p>` : ''}
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

if (showAllButton && calendarContainer) {
    showAllButton.addEventListener('click', () => {
        viewAll = !viewAll;
        if (viewAll) {
            calendarContainer.style.display = 'none';
            showAllButton.textContent = 'Show by Date';
            setupAllReflectionsListener();
        } else {
            calendarContainer.style.display = 'block';
            showAllButton.textContent = 'Show All';
            paginationDiv.innerHTML = '';
            renderCalendar();
            setupReflectionsListener(selectedDate);
        }
    });
}
// Reflection Form
const reflectionForm = document.getElementById('daily-reflection');
if (reflectionForm) {
    reflectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const didWell = document.getElementById('didWell').value;
        const didPoorly = document.getElementById('didPoorly').value;
        const improveTomorrow = document.getElementById('improveTomorrow').value;
        const user = auth.currentUser;

        if (!user) {
            alert('You must be logged in to save reflections.');
            return;
        }

        try {
            const feedback = await fetchGeminiFeedback(didWell, didPoorly, improveTomorrow);
            await addDoc(collection(db, 'users', user.uid, 'reflections'), {
                didWell,
                didPoorly,
                improveTomorrow,
                feedback,
                createdAt: Timestamp.now()
            });
            console.log("Reflection saved!");
            reflectionForm.reset();
            localStorage.setItem('latestReflection', JSON.stringify({ didWell, didPoorly, improveTomorrow, feedback }));
            window.location.href = 'summary.html';
        } catch (error) {
            console.error("Error adding document: ", error);
            alert(`Failed to save reflection: ${error.message}`);
        }
    });
}

if (reflectionsList) {
    reflectionsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-reflection')) {
            const id = e.target.dataset.id;
            if (confirm('Delete this reflection?')) {
                const user = auth.currentUser;
                if (!user) {
                    alert('You must be logged in to delete reflections.');
                    return;
                }
                try {
                    await deleteDoc(doc(db, 'users', user.uid, 'reflections', id));
                } catch (error) {
                    console.error('Delete error:', error);
                    alert(`Failed to delete reflection: ${error.message}`);
                }
            }
        }
    });
}

if (downloadButton) {
    downloadButton.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const reflectionsRef = collection(db, 'users', user.uid, 'reflections');
            const snapshot = await getDocs(reflectionsRef);
            const data = snapshot.docs.map(snap => {
                const d = snap.data();
                return {
                    didWell: d.didWell,
                    didPoorly: d.didPoorly,
                    improveTomorrow: d.improveTomorrow,
                    feedback: d.feedback,
                    createdAt: new Date(getMillis(d.createdAt)).toISOString()
                };
            });
            if (data.length === 0) {
                alert('No reflections to download.');
                return;
            }
            const format = downloadFormatSelect ? downloadFormatSelect.value : 'json';
            const { content, mime, ext } = formatReflections(data, format);
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reflections.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert(`Failed to download reflections: ${error.message}`);
        }
    });
}

function formatReflections(data, format) {
    switch (format) {
        case 'markdown': {
            const content = data.map(r => `### ${r.createdAt}\n- **Did well:** ${r.didWell}\n- **Did poorly:** ${r.didPoorly}\n- **Improve tomorrow:** ${r.improveTomorrow}\n- **AI Feedback:** ${r.feedback || ''}`).join('\n\n');
            return { content, mime: 'text/markdown', ext: 'md' };
        }
        case 'html': {
            const content = `<!DOCTYPE html><html><body>` +
                data.map(r => `<h3>${r.createdAt}</h3><p><strong>Did well:</strong> ${r.didWell}</p><p><strong>Did poorly:</strong> ${r.didPoorly}</p><p><strong>Improve tomorrow:</strong> ${r.improveTomorrow}</p><p><strong>AI Feedback:</strong> ${r.feedback || ''}</p>`).join('<hr>') +
                `</body></html>`;
            return { content, mime: 'text/html', ext: 'html' };
        }
        case 'csv': {
            const headers = ['createdAt','didWell','didPoorly','improveTomorrow','feedback'];
            const rows = data.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','));
            const content = [headers.join(',')].concat(rows).join('\n');
            return { content, mime: 'text/csv', ext: 'csv' };
        }
        case 'txt': {
            const content = data.map(r => `${r.createdAt}\nDid well: ${r.didWell}\nDid poorly: ${r.didPoorly}\nImprove tomorrow: ${r.improveTomorrow}\nAI Feedback: ${r.feedback || ''}`).join('\n\n');
            return { content, mime: 'text/plain', ext: 'txt' };
        }
        default: {
            return { content: JSON.stringify(data, null, 2), mime: 'application/json', ext: 'json' };
        }
    }
}

async function fetchGeminiFeedback(didWell, didPoorly, improveTomorrow) {
    if (!GEMINI_API_KEY) {
        return 'No API key configured for AI feedback.';
    }
    const prompt = `You are an encouraging and concise reflection coach. Based on the user's answers:\n- Did well: ${didWell}\n- Did poorly: ${didPoorly}\n- Improve tomorrow: ${improveTomorrow}\nRespond with constructive feedback.`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ]
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API error:', errText);
            return `Failed to fetch AI feedback: ${errText}`;
        }
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No feedback generated.';
    } catch (error) {
        console.error('Gemini API error:', error);
        return `Failed to fetch AI feedback: ${error.message}`;
    }
}
