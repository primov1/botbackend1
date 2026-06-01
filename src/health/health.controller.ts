import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Railway healthcheck uchun. Bot tirik, lekin DB uzilgan holatni ham aniqlaydi.
 */
@Controller()
export class HealthController {
    constructor(private readonly dataSource: DataSource) {}

    @Get('health')
    async health() {
        let db = false;
        try {
            await this.dataSource.query('SELECT 1');
            db = true;
        } catch {
            db = false;
        }
        return {
            status: db ? 'ok' : 'degraded',
            db,
            uptime: Math.round(process.uptime()),
            ts: new Date().toISOString(),
        };
    }
}
