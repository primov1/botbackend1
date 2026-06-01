import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from '../common/entities/user.entity';

/**
 * Oylik bonus reset. Bu yerda (bot_backend, Railway — doimiy jarayon) joylashgan,
 * chunki @Cron faqat doimiy ishlaydigan jarayonda yuradi. (Avval botfront'da edi,
 * lekin u Vercel serverless'da ishlamasdi.)
 */
@Injectable()
export class BonusResetService {
    private readonly logger = new Logger(BonusResetService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    // Har oyning 1-kuni, soat 00:00
    @Cron('0 0 1 * *', { name: 'monthly-bonus-reset' })
    async resetMonthlyBonus() {
        const result = await this.userRepo.update({ bonus: Not(0) }, { bonus: 0 });
        this.logger.log(
            `Oylik bonus reset: ${result.affected ?? 0} foydalanuvchining bonusi 0 ga tushirildi.`,
        );
    }
}
