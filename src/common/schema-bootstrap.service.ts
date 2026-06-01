import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Production'da `synchronize: false` bo'lgani uchun TypeORM ba'zi narsalarni
 * (partial unique index, sessiya jadvali, phone ustunini moslash) avtomatik
 * yaratmaydi. Bu xizmat ularni boot'da idempotent (IF NOT EXISTS / guard bilan)
 * tayyorlaydi — Railway'da migration CLI'ga ehtiyoj qolmaydi.
 */
@Injectable()
export class SchemaBootstrapService implements OnModuleInit {
    private readonly logger = new Logger(SchemaBootstrapService.name);

    constructor(private readonly dataSource: DataSource) {}

    async onModuleInit(): Promise<void> {
        await this.run(
            'bot_sessions jadvali',
            `CREATE TABLE IF NOT EXISTS "bot_sessions" (
                "key" varchar PRIMARY KEY,
                "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "updatedAt" timestamptz NOT NULL DEFAULT now()
            )`,
        );

        // Bitta mahsulot uchun bitta "pending" tekshiruv — DB darajasida dublikatni bloklaydi
        await this.run(
            'purchases pending unique index',
            `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_purchases_pending"
             ON "purchases" ("userId", "productId")
             WHERE "status" = 'pending'`,
        );

        // phone: bo'sh '' default + NOT NULL + unique -> ikkinchi bo'sh telefon to'qnashardi.
        // null'ga ruxsat berib, mavjud bo'shlarni null'ga aylantiramiz (unique null'larni
        // alohida deb hisoblaydi, ya'ni to'qnashuv yo'qoladi). Mavjud unique constraint saqlanadi.
        await this.run('phone DROP DEFAULT', `ALTER TABLE "users" ALTER COLUMN "phone" DROP DEFAULT`);
        await this.run('phone DROP NOT NULL', `ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL`);
        await this.run('phone "" -> NULL', `UPDATE "users" SET "phone" = NULL WHERE "phone" = ''`);
    }

    private async run(label: string, sql: string): Promise<void> {
        try {
            await this.dataSource.query(sql);
        } catch (err) {
            // Boot'ni to'xtatmaymiz — faqat ogohlantiramiz (masalan ruxsat yo'q yoki allaqachon mos)
            this.logger.warn(`Schema bootstrap (${label}) bajarilmadi: ${(err as Error).message}`);
        }
    }
}
