/**
 * Boot'da majburiy muhit o'zgaruvchilarini tekshiradi.
 * Bo'lmasa, soatlab 401/crash loop o'rniga darhol aniq xato bilan to'xtaymiz.
 */
export function validateEnv(): void {
    const errors: string[] = [];

    if (!process.env.BOT_TOKEN || !process.env.BOT_TOKEN.trim()) {
        errors.push('BOT_TOKEN o\'rnatilmagan (Telegram bot tokeni).');
    }

    const hasUrl = !!process.env.DATABASE_URL;
    const hasHostCfg = !!process.env.DB_HOST;
    if (!hasUrl && !hasHostCfg) {
        errors.push('DATABASE_URL yoki DB_HOST o\'rnatilmagan (ma\'lumotlar bazasi).');
    }

    if (errors.length) {
        // eslint-disable-next-line no-console
        console.error(
            '\n❌ Konfiguratsiya xatosi — ilova ishga tushmaydi:\n' +
            errors.map((e) => `  • ${e}`).join('\n') +
            '\nRailway → Variables ga kerakli qiymatlarni qo\'shing.\n',
        );
        process.exit(1);
    }
}
