import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
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

const DEFAULT_WIDGETS = {
    counter: {
        color: "#ffffff",
        x: 30,
        y: 30,
        scale: 1,
        fontSize: 65,
        anchor: "right"
    },
    socialPromo: {
        visible: true,
        youtubeVisible: true,
        twitchVisible: true,
        text: "Mr_Flashkid",
        x: 24,
        y: 130,
        scale: 1,
        layout: "vertical",
        darkBackground: true
    },
    customText: {
        visible: false,
        text: "",
        x: 24,
        y: 250,
        scale: 1,
        fontSize: 52,
        color: "#ffffff"
    },
    twitchChat: {
        visible: false,
        x: 24,
        y: 360,
        width: 360,
        height: 520,
        scale: 1,
        channel: "",
        parentDomain: "mrflashkid.live",
        customUrl: ""
    }
};

const COLLAPSE_STATE_KEY = "mrflashkid.remoteCollapsedSections";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const streamDataRef = ref(db, "streamData");
const widgetsRef = ref(db, "streamData/widgets");
const countRef = ref(db, "streamData/counter");
const labelRef = ref(db, "streamData/label");
const pauseRef = ref(db, "streamData/isPaused");
const legacyColorRef = ref(db, "streamData/color");
const visibilityRef = ref(db, "streamData/isCounterVisible");
const widgetRefs = {
    counter: ref(db, "streamData/widgets/counter"),
    socialPromo: ref(db, "streamData/widgets/socialPromo"),
    customText: ref(db, "streamData/widgets/customText"),
    twitchChat: ref(db, "streamData/widgets/twitchChat")
};

let currentCount = 0;
let isPaused = false;
let isCounterVisible = true;
let listenersStarted = false;

const widgetStates = {
    counter: { ...DEFAULT_WIDGETS.counter },
    socialPromo: { ...DEFAULT_WIDGETS.socialPromo },
    customText: { ...DEFAULT_WIDGETS.customText },
    twitchChat: { ...DEFAULT_WIDGETS.twitchChat }
};

const loginPanel = document.getElementById("login-panel");
const controlPanel = document.getElementById("control-panel");
const loginError = document.getElementById("login-error");
const passwordInput = document.getElementById("login-password");
const togglePasswordButton = document.getElementById("toggle-password");

const widgetControls = [
    { id: "counter-color", widget: "counter", field: "color", type: "color" },
    { id: "counter-anchor", widget: "counter", field: "anchor", type: "select" },
    { id: "counter-x", widget: "counter", field: "x", type: "number" },
    { id: "counter-y", widget: "counter", field: "y", type: "number" },
    { id: "counter-scale", widget: "counter", field: "scale", type: "number" },
    { id: "counter-font-size", widget: "counter", field: "fontSize", type: "number" },
    { id: "social-visible", widget: "socialPromo", field: "visible", type: "checkbox" },
    { id: "social-youtube-visible", widget: "socialPromo", field: "youtubeVisible", type: "checkbox" },
    { id: "social-twitch-visible", widget: "socialPromo", field: "twitchVisible", type: "checkbox" },
    { id: "social-background", widget: "socialPromo", field: "darkBackground", type: "checkbox" },
    { id: "social-text", widget: "socialPromo", field: "text", type: "text" },
    { id: "social-layout", widget: "socialPromo", field: "layout", type: "select" },
    { id: "social-x", widget: "socialPromo", field: "x", type: "number" },
    { id: "social-y", widget: "socialPromo", field: "y", type: "number" },
    { id: "social-scale", widget: "socialPromo", field: "scale", type: "number" },
    { id: "custom-text-visible", widget: "customText", field: "visible", type: "checkbox" },
    { id: "custom-text-value", widget: "customText", field: "text", type: "text" },
    { id: "custom-text-x", widget: "customText", field: "x", type: "number" },
    { id: "custom-text-y", widget: "customText", field: "y", type: "number" },
    { id: "custom-text-scale", widget: "customText", field: "scale", type: "number" },
    { id: "custom-text-font-size", widget: "customText", field: "fontSize", type: "number" },
    { id: "custom-text-color", widget: "customText", field: "color", type: "color" },
    { id: "chat-visible", widget: "twitchChat", field: "visible", type: "checkbox" },
    { id: "chat-channel", widget: "twitchChat", field: "channel", type: "text" },
    { id: "chat-parent-domain", widget: "twitchChat", field: "parentDomain", type: "text" },
    { id: "chat-custom-url", widget: "twitchChat", field: "customUrl", type: "text" },
    { id: "chat-x", widget: "twitchChat", field: "x", type: "number" },
    { id: "chat-y", widget: "twitchChat", field: "y", type: "number" },
    { id: "chat-width", widget: "twitchChat", field: "width", type: "number" },
    { id: "chat-height", widget: "twitchChat", field: "height", type: "number" },
    { id: "chat-scale", widget: "twitchChat", field: "scale", type: "number" }
];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await activateControlPanel();
    } else {
        loginPanel.style.display = "block";
        controlPanel.style.display = "none";
    }
});

document.getElementById("login-btn").onclick = () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    loginError.style.display = "none";

    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            console.error(error);
            loginError.style.display = "block";
            loginError.innerText = "Access Denied. Check your email/password.";
        });
};

togglePasswordButton.onclick = () => {
    const nextType = passwordInput.type === "password" ? "text" : "password";
    const isVisible = nextType === "text";

    passwordInput.type = nextType;
    togglePasswordButton.innerText = isVisible ? "Hide" : "Show";
    togglePasswordButton.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
};

async function activateControlPanel() {
    loginPanel.style.display = "none";
    controlPanel.style.display = "block";

    if (listenersStarted) return;

    listenersStarted = true;
    await initializeWidgetDefaults();
    startDatabaseListeners();
    bindWidgetControls();
    initCollapsibleSections();
}

async function initializeWidgetDefaults() {
    try {
        const [widgetsSnapshot, legacyColorSnapshot] = await Promise.all([
            get(widgetsRef),
            get(legacyColorRef)
        ]);
        const currentWidgets = widgetsSnapshot.val() || {};
        const widgetDefaults = {
            ...DEFAULT_WIDGETS,
            counter: {
                ...DEFAULT_WIDGETS.counter,
                color: getLegacyCounterColor(legacyColorSnapshot.val())
            }
        };
        const missingUpdates = {};

        Object.entries(widgetDefaults).forEach(([widgetName, defaults]) => {
            const currentWidget = currentWidgets[widgetName] || {};

            Object.entries(defaults).forEach(([field, defaultValue]) => {
                if (!Object.prototype.hasOwnProperty.call(currentWidget, field)) {
                    missingUpdates[`widgets/${widgetName}/${field}`] = defaultValue;
                }
            });
        });

        if (Object.keys(missingUpdates).length > 0) {
            await update(streamDataRef, missingUpdates);
        }
    } catch (error) {
        console.error("Could not initialize widget defaults.", error);
    }
}

function startDatabaseListeners() {
    onValue(countRef, (snapshot) => {
        if (snapshot.exists()) {
            currentCount = snapshot.val();
            document.getElementById("counter-display").innerText = currentCount;
        }
    });

    onValue(pauseRef, (snapshot) => {
        if (snapshot.exists()) {
            isPaused = snapshot.val();
            const pauseBtn = document.getElementById("pause");

            if (isPaused) {
                pauseBtn.innerText = "Resume Stream";
                pauseBtn.classList.remove("warning");
                pauseBtn.classList.add("success");
            } else {
                pauseBtn.innerText = "Pause Stream";
                pauseBtn.classList.remove("success");
                pauseBtn.classList.add("warning");
            }
        }
    });

    onValue(visibilityRef, (snapshot) => {
        if (snapshot.exists()) {
            isCounterVisible = snapshot.val();
            document.getElementById("visibility-toggle").checked = isCounterVisible;
        } else {
            document.getElementById("visibility-toggle").checked = true;
        }
    });

    onValue(widgetRefs.counter, (snapshot) => {
        widgetStates.counter = withDefaults("counter", snapshot.val());
        syncWidgetControls("counter");
    });

    onValue(widgetRefs.socialPromo, (snapshot) => {
        widgetStates.socialPromo = withDefaults("socialPromo", snapshot.val());
        syncWidgetControls("socialPromo");
    });

    onValue(widgetRefs.customText, (snapshot) => {
        widgetStates.customText = withDefaults("customText", snapshot.val());
        syncWidgetControls("customText");
    });

    onValue(widgetRefs.twitchChat, (snapshot) => {
        widgetStates.twitchChat = withDefaults("twitchChat", snapshot.val());
        syncWidgetControls("twitchChat");
    });
}

function bindWidgetControls() {
    widgetControls.forEach((control) => {
        const element = document.getElementById(control.id);
        if (!element) return;

        getControlEventNames(control.type).forEach((eventName) => {
            element.addEventListener(eventName, () => {
                handleWidgetControlChange(element, control);
            });
        });
    });

    document.querySelectorAll("[data-move-widget]").forEach((button) => {
        button.addEventListener("click", () => {
            const widget = button.dataset.moveWidget;
            const direction = button.dataset.direction;
            const delta = getMoveDelta(widget, direction);

            if (!delta) return;

            updateWidget(widget, {
                x: getNumericWidgetValue(widget, "x") + delta.x,
                y: getNumericWidgetValue(widget, "y") + delta.y
            });
        });
    });

    document.querySelectorAll("[data-reset-widget]").forEach((button) => {
        button.addEventListener("click", () => {
            const widget = button.dataset.resetWidget;
            const defaults = DEFAULT_WIDGETS[widget];
            if (!defaults) return;

            updateWidget(widget, {
                x: defaults.x,
                y: defaults.y
            });
        });
    });
}

function getControlEventNames(type) {
    if (type === "color") return ["input", "change"];
    if (type === "checkbox" || type === "select") return ["change"];
    return ["input"];
}

function handleWidgetControlChange(element, control) {
    const value = readControlValue(element, control.type);
    if (typeof value === "undefined") return;

    updateWidget(control.widget, { [control.field]: value });
}

function getMoveDelta(widget, direction) {
    const step = 10;
    const horizontalStep = widget === "counter" && widgetStates.counter.anchor === "right" ? -step : step;

    return {
        up: { x: 0, y: -step },
        down: { x: 0, y: step },
        left: { x: -horizontalStep, y: 0 },
        right: { x: horizontalStep, y: 0 }
    }[direction];
}

function withDefaults(widget, settings) {
    return { ...DEFAULT_WIDGETS[widget], ...(settings || {}) };
}

function syncWidgetControls(widget) {
    const state = widgetStates[widget];

    widgetControls
        .filter((control) => control.widget === widget)
        .forEach((control) => {
            const element = document.getElementById(control.id);
            if (!element) return;

            const value = state[control.field];

            if (control.type === "checkbox") {
                element.checked = Boolean(value);
                return;
            }

            element.value = value;
        });
}

function readControlValue(element, type) {
    if (type === "checkbox") return element.checked;

    if (type === "number") {
        if (element.value === "") return undefined;
        const value = Number(element.value);
        return Number.isFinite(value) ? value : undefined;
    }

    if (type === "color") {
        return /^#[0-9a-f]{6}$/i.test(element.value) ? element.value : undefined;
    }

    return element.value;
}

function getNumericWidgetValue(widget, field) {
    const value = Number(widgetStates[widget]?.[field]);
    if (Number.isFinite(value)) return value;

    return DEFAULT_WIDGETS[widget]?.[field] || 0;
}

function updateWidget(widget, fields) {
    if (!widgetRefs[widget]) return;

    updateValue(widgetRefs[widget], fields).catch((error) => {
        console.error(`Could not update ${widget}.`, error);
    });
}

function setValue(firebaseRef, value) {
    return set(firebaseRef, value);
}

function updateValue(firebaseRef, fields) {
    return update(firebaseRef, fields);
}

function getLegacyCounterColor(value) {
    return typeof value === "string" && value.trim() !== "" ? value : DEFAULT_WIDGETS.counter.color;
}

function initCollapsibleSections() {
    const collapsedSections = loadCollapsedSections();

    document.querySelectorAll("[data-collapse-section]").forEach((section) => {
        const sectionName = section.dataset.collapseSection;
        const toggle = section.querySelector("[data-collapse-target]");
        const target = toggle ? document.getElementById(toggle.dataset.collapseTarget) : null;
        const header = section.querySelector(".panel-header");

        if (!sectionName || !toggle || !target) return;

        const toggleSection = () => {
            const nextCollapsed = !section.classList.contains("is-collapsed");
            const nextSections = new Set(loadCollapsedSections());

            setSectionCollapsed(section, toggle, target, nextCollapsed);

            if (nextCollapsed) {
                nextSections.add(sectionName);
            } else {
                nextSections.delete(sectionName);
            }

            saveCollapsedSections([...nextSections]);
        };

        setSectionCollapsed(section, toggle, target, collapsedSections.includes(sectionName));

        toggle.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleSection();
        });

        header?.addEventListener("click", (event) => {
            if (event.target.closest("button, input, label, select, textarea, a")) return;

            toggleSection();
        });
    });
}

function setSectionCollapsed(section, toggle, target, isCollapsed) {
    section.classList.toggle("is-collapsed", isCollapsed);
    target.hidden = isCollapsed;
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
    toggle.title = isCollapsed ? "Expand section" : "Collapse section";
}

function loadCollapsedSections() {
    try {
        const sections = JSON.parse(localStorage.getItem(COLLAPSE_STATE_KEY) || "[]");
        return Array.isArray(sections) ? sections : [];
    } catch {
        return [];
    }
}

function saveCollapsedSections(sections) {
    localStorage.setItem(COLLAPSE_STATE_KEY, JSON.stringify(sections));
}

document.getElementById("add").onclick = () => setValue(countRef, currentCount + 1);
document.getElementById("sub").onclick = () => {
    if (currentCount > 0) setValue(countRef, currentCount - 1);
};

document.getElementById("pause").onclick = () => setValue(pauseRef, !isPaused);

document.getElementById("update-label-btn").onclick = () => {
    let newLabel = document.getElementById("custom-label-input").value.trim();
    if (newLabel !== "") {
        if (!newLabel.endsWith(":")) {
            newLabel += ":";
        }

        setValue(labelRef, newLabel);
        document.getElementById("custom-label-input").value = "";
    }
};

document.getElementById("set-number-btn").onclick = () => {
    const exactNumber = parseInt(document.getElementById("exact-number-input").value, 10);
    if (!Number.isNaN(exactNumber) && exactNumber >= 0) {
        setValue(countRef, exactNumber);
        document.getElementById("exact-number-input").value = "";
    }
};

document.getElementById("visibility-toggle").onchange = (event) => {
    setValue(visibilityRef, event.target.checked);
};
