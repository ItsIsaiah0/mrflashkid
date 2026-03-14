import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

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
const auth = getAuth(app);

const countRef = ref(db, 'streamData/counter');
const labelRef = ref(db, 'streamData/label');
const pauseRef = ref(db, 'streamData/isPaused');
const colorRef = ref(db, 'streamData/color');
const visibilityRef = ref(db, 'streamData/isCounterVisible');

let currentCount = 0;
let isPaused = false;
let isCounterVisible = true;

const loginPanel = document.getElementById('login-panel');
const controlPanel = document.getElementById('control-panel');
const loginError = document.getElementById('login-error');

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginPanel.style.display = 'none';
        controlPanel.style.display = 'block';

        startDatabaseListeners();
    } else {
        loginPanel.style.display = 'block';
        controlPanel.style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    loginError.style.display = 'none';

    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            console.error(error);
            loginError.style.display = 'block';
            loginError.innerText = "Access Denied. Check your email/password.";
        });
};


function startDatabaseListeners() {
    onValue(countRef, (snapshot) => {
        if (snapshot.exists()) {
            currentCount = snapshot.val();
            document.getElementById('counter-display').innerText = currentCount;
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

    onValue(colorRef, (snapshot) => {
        if (snapshot.exists()) {
            document.getElementById('color-picker').value = snapshot.val();
        }
    });

    onValue(visibilityRef, (snapshot) => {
        if (snapshot.exists()) {
            isCounterVisible = snapshot.val();
            document.getElementById('visibility-toggle').checked = isCounterVisible;
        } else {
            document.getElementById('visibility-toggle').checked = true;
        }
    });
}

document.getElementById('add').onclick = () => set(countRef, currentCount + 1);
document.getElementById('sub').onclick = () => {
    if (currentCount > 0) set(countRef, currentCount - 1);
};

document.getElementById('pause').onclick = () => set(pauseRef, !isPaused);


document.getElementById('update-label-btn').onclick = () => {
    let newLabel = document.getElementById('custom-label-input').value.trim();
    if (newLabel !== "") { 
        if (!newLabel.endsWith(':')) {
            newLabel += ':';
        }
        set(labelRef, newLabel);
        
        document.getElementById('custom-label-input').value = ""; 
    }
};

document.getElementById('set-number-btn').onclick = () => {
    const exactNumber = parseInt(document.getElementById('exact-number-input').value);
    if (!isNaN(exactNumber) && exactNumber >= 0) {
        set(countRef, exactNumber);
        document.getElementById('exact-number-input').value = "";
    }
};

document.getElementById('color-picker').addEventListener('input', (event) => {
    set(colorRef, event.target.value);
});

document.getElementById('visibility-toggle').onchange = (event) => {
    set(visibilityRef, event.target.checked);
};

const chevronBtn = document.getElementById('chevron-btn');
const counterContent = document.getElementById('counter-content');

chevronBtn.onclick = () => {
    if (counterContent.style.display !== 'none') {
        counterContent.style.display = 'none';
        chevronBtn.style.transform = 'rotate(-90deg)';
    } else {
        counterContent.style.display = 'block';
        chevronBtn.style.transform = 'rotate(0deg)';
    }
};