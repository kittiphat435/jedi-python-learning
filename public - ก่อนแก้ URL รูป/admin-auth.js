// admin-auth.js
import { ADMIN_EMAILS } from './admin-config.js';

export async function checkAdminAuth(user) {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}