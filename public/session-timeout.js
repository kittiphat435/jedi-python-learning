// session-timeout.js
(function() {
    // 4 hours in milliseconds
    const MAX_SESSION_MS = 4 * 60 * 60 * 1000;

    function checkSession(user) {
        if (!user || !user.metadata || !user.metadata.lastSignInTime) return;
        
        const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
        const now = Date.now();
        
        if (now - lastSignIn > MAX_SESSION_MS) {
            console.log("Session expired. Logging out...");
            alert('เซสชันของคุณหมดอายุแล้ว (เกิน 4 ชั่วโมง) กรุณาเข้าสู่ระบบใหม่');
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html';
            }).catch(error => {
                console.error("Logout error:", error);
                window.location.href = 'index.html';
            });
        }
    }

    // Check periodically every 1 minute
    setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            checkSession(firebase.auth().currentUser);
        }
    }, 60000);

    // Initial check when auth state changes (e.g. on page load)
    function initSessionCheck() {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.apps.length > 0) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    checkSession(user);
                }
            });
        } else if (typeof firebase !== 'undefined') {
            // Check again shortly if firebase is loaded but app is not initialized yet
            setTimeout(initSessionCheck, 100);
        }
    }
    
    // Start the checking loop
    initSessionCheck();
})();
