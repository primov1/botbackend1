import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Telegraf sessiyasi uchun Postgres-asosli store.
 * Fayl (sessions.json) o'rniga — Railway redeploy/restart'da sessiya
 * (scene/wizard holati) yo'qolmaydi. Jadval SchemaBootstrapService'da yaratiladi.
 */
export class PgSessionStore<T = object> {
    private readonly logger = new Logger(PgSessionStore.name);

    constructor(private readonly dataSource: DataSource) {}

    async get(key: string): Promise<T | undefined> {
        try {
            const rows = await this.dataSource.query(
                'SELECT "data" FROM "bot_sessions" WHERE "key" = $1',
                [key],
            );
            return rows[0]?.data as T | undefined;
        } catch (err) {
            this.logger.warn(`Sessiya o'qilmadi (${key}): ${(err as Error).message}`);
            return undefined;
        }
    }

    async set(key: string, value: T): Promise<void> {
        try {
            await this.dataSource.query(
                `INSERT INTO "bot_sessions" ("key", "data", "updatedAt")
                 VALUES ($1, $2::jsonb, now())
                 ON CONFLICT ("key") DO UPDATE
                 SET "data" = EXCLUDED."data", "updatedAt" = now()`,
                [key, JSON.stringify(value ?? {})],
            );
        } catch (err) {
            this.logger.warn(`Sessiya saqlanmadi (${key}): ${(err as Error).message}`);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.dataSource.query('DELETE FROM "bot_sessions" WHERE "key" = $1', [key]);
        } catch (err) {
            this.logger.warn(`Sessiya o'chirilmadi (${key}): ${(err as Error).message}`);
        }
    }
}
