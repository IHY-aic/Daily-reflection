import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function renderReflection(data) {
    document.getElementById('did-well').textContent = data.didWell;
    document.getElementById('did-poorly').textContent = data.didPoorly;
    document.getElementById('improve-tomorrow').textContent = data.improveTomorrow;
    document.getElementById('ai-feedback').innerHTML = `<h3>AI Feedback</h3><p>${data.feedback}</p>`;
}

function showMessage(message) {
    document.getElementById('app-container').innerHTML = `<p>${message}</p><a href="index.html">Back to reflections</a>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const localData = JSON.parse(localStorage.getItem('latestReflection') || '{}');
    if (localData.didWell) {
        renderReflection(localData);
    } else {
        document.getElementById('ai-feedback').innerHTML = '<p>Loading reflection...</p>';
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (!localData.didWell) {
                showMessage('No reflection found.');
            }
            return;
        }
        try {
            const reflectionsRef = collection(db, 'reflections');
            const q = query(reflectionsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const d = snap.docs[0].data();
                renderReflection({
                    didWell: d.didWell,
                    didPoorly: d.didPoorly,
                    improveTomorrow: d.improveTomorrow,
                    feedback: d.feedback || 'No feedback stored.'
                });
            } else if (!localData.didWell) {
                showMessage('No reflection found.');
            }
        } catch (error) {
            console.error('Summary load error:', error);
            showMessage(`Failed to load reflection: ${error.message}`);
        }
    });
});
