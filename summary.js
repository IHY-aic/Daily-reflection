document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(localStorage.getItem('latestReflection') || '{}');
    if (!data.didWell) {
        document.getElementById('app-container').innerHTML = '<p>No reflection found.</p><a href="index.html">Back to reflections</a>';
        return;
    }
    document.getElementById('did-well').textContent = data.didWell;
    document.getElementById('did-poorly').textContent = data.didPoorly;
    document.getElementById('improve-tomorrow').textContent = data.improveTomorrow;
    document.getElementById('ai-feedback').innerHTML = `<h3>AI Feedback</h3><p>${data.feedback}</p>`;
});
