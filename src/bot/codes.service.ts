import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Code } from '../common/entities/code.entity';

/** Kodni ishlatishga urinish natijasi. */
export type ConsumeResult =
    | { status: 'ok'; rec: Code }
    | { status: 'used' }
    | { status: 'expired' }
    | { status: 'not_found' };

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

    /** Bir necha kodni tekshirish — har birining holati va ballini qaytaradi. */
    async validateMultiple(codes: string[]): Promise<{ code: string; rec: Code | null }[]> {
        return Promise.all(
            codes.map(async (code) => ({ code, rec: await this.validate(code) })),
        );
    }

    /** Kodni FAQAT tekshiradi, belgilamaydi. Bekor qilinsa kod saqlanib qoladi. */
    async check(code: string): Promise<ConsumeResult> {
        const c = (code ?? '').trim().toUpperCase();
        if (!c) return { status: 'not_found' };
        try {
            const found = await this.codeRepo.findOne({ where: { code: c } });
            if (!found) return { status: 'not_found' };
            if (found.isUsed) return { status: 'used' };
            if (new Date(found.expiresAt).getTime() < Date.now()) return { status: 'expired' };
            return { status: 'ok', rec: found };
        } catch {
            return { status: 'not_found' };
        }
    }

    /**
     * Kodni ATOMIK tarzda ishlatilgan deb belgilaydi va holatini qaytaradi.
     * Bir marta ishlatilgach qayta ishlatib bo'lmaydi: keyingi safar { status: 'used' }.
     */
    async consume(code: string, userId: number): Promise<ConsumeResult> {
        const c = (code ?? '').trim().toUpperCase();
        if (!c) return { status: 'not_found' };
        try {
            const found = await this.codeRepo.findOne({ where: { code: c } });
            if (!found) return { status: 'not_found' };
            if (found.isUsed) return { status: 'used' };
            if (new Date(found.expiresAt).getTime() < Date.now()) return { status: 'expired' };

            // Atomik belgilash — poyga holatida faqat bittasi muvaffaqiyatli bo'ladi
            const marked = await this.markUsed(found.id, userId);
            if (!marked) return { status: 'used' };
            return { status: 'ok', rec: found };
        } catch {
            return { status: 'not_found' };
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
