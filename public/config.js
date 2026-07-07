const config = {
    API_URL: 'https://gxe3h3lu05.execute-api.us-east-1.amazonaws.com/dev/run-code',
    API_KEY: 'loKFfURQof9Wcz8yfc7Ym4yZ4RiXPtOx3AhxPLmR'
};

const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};

// Initialize Firebase if it hasn't been initialized yet
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

if (typeof firebase !== 'undefined' && firebase.apps?.length) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
        // try {
        //     firebase.firestore().useEmulator('localhost', 8080);
        // } catch (_) {}
    }
}
