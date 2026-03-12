import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyChLFvlJ-_-a56lqE3U7IgegyRER7OAWZc",
    authDomain: "stream-overlay-5eba9.firebaseapp.com",
    databaseURL: "https://stream-overlay-5eba9-default-rtdb.firebaseio.com",
    projectId: "stream-overlay-5eba9",
    storageBucket: "stream-overlay-5eba9.firebasestorage.app",
    messagingSenderId: "11285905775",
    appId: "1:11285905775:web:b020cbb736df0a9b68a89a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const runsRef = ref(db, 'streamData/runs');
const pauseRef = ref(db, 'streamData/isPaused');

let currentRuns = 0;
let isPaused = false;

const SECRET_HASH = "96830a291ad510848867471d7ddfc11474b333a8241c4667a2de229e9c0c2644";

async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const loginPanel = document.getElementById('login-panel');
const controlPanel = document.getElementById('control-panel');
const loginError = document.getElementById('login-error');

document.getElementById('login-btn').onclick = async () => {
    const typedWord = document.getElementById('secret-word').value;
    
    const typedHash = await hashPassword(typedWord);
    
    if (typedHash === SECRET_HASH) {

        loginPanel.style.display = 'none';
        controlPanel.style.display = 'block';
    } else {

        loginError.style.display = 'block';
    }
};


onValue(runsRef, (snapshot) => {
    if (snapshot.exists()) {
        currentRuns = snapshot.val();
        document.getElementById('run-display').innerText = currentRuns;
    }
});

onValue(pauseRef, (snapshot) => {
    if (snapshot.exists()) {
        isPaused = snapshot.val();
        const pauseBtn = document.getElementById('pause');
        if (isPaused) {
            pauseBtn.innerText = "▶ Resume Stream";
            pauseBtn.style.background = "#4CAF50"; 
        } else {
            pauseBtn.innerText = "⏸ Pause Stream";
            pauseBtn.style.background = "#ff9800"; 
        }
    }
});

document.getElementById('add').onclick = () => {
    set(runsRef, currentRuns + 1);
};

document.getElementById('sub').onclick = () => {
    if (currentRuns > 0) set(runsRef, currentRuns - 1);
};

document.getElementById('pause').onclick = () => {
    set(pauseRef, !isPaused);
};