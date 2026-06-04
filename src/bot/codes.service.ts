import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Code } from '../common/entities/code.entity';

/**
 * Bot tomonidan kodlarni tekshirish/belgilash. Jadval admin panel (botfront)
 * tomonidan yaratiladi — bu yerda faqat o'qiymiz va ishlatilgan deb belgilaymiz.
 */
@Injectable()
export class CodesService {
    constructor(
        @InjectRepository(Code) private readonly codeRepo: Repository<Code>,
    ) {}

    /** Kod yaroqlimi? (mavjud, ishlatilmagan, muddati o'tmagan) */
    async validate(code: string): Promise<Code | null> {
        const c = (code ?? '').trim().toUpperCase();
        if (!c) return null;
        try {
            const found = await this.codeRepo.findOne({ where: { code: c } });
            if (!found || found.isUsed) return null;
            if (new Date(found.expiresAt).getTime() < Date.now()) return null;
            return found;
        } catch {
            return null;
        }
    }

    /** Ishlatilgan deb belgilash — atomik (faqat ishlatilmagan bo'lsa). */
    async markUsed(codeId: number, userId: number): Promise<boolean> {
        try {
            const res = await this.codeRepo
                .createQueryBuilder()
                .update(Code)
                .set({ isUsed: true, usedByUserId: userId, usedAt: () => 'now()' })
                .where('id = :id AND "isUsed" = false', { id: codeId })
                .execute();
            return (res.affected ?? 0) > 0;
        } catch {
            return false;
        }
    }
}
