/**
 * Telegramга xabar yuborishni xavfsiz qiladigan yordamchilar.
 */

/** HTML parse_mode uchun maxsus belgilarni escape qiladi (parse xatosini oldini oladi). */
export function escapeHtml(input: string): string {
    return (input ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * URL faqat http/https bo'lsa tugma uchun yaroqli — aks holda Telegram
 * BUTTON_URL_INVALID beradi va butun xabar yuborilmaydi.
 */
export function isValidButtonUrl(url: string | undefined | null): url is string {
    if (!url) return false;
    try {
        const u = new URL(url.trim());
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}
