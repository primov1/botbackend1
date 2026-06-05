import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { Purchase } from '../common/entities/purchase.entity';
import { GiftPurchase } from '../common/entities/gift-purchase.entity';
import { Code } from '../common/entities/code.entity';
import { Product } from '../common/entities/product.entity';

export type RedeemResult =
    | { ok: true; points: number; newBonus: number; productTitle: string }
    | { ok: false; reason: 'not_registered' | 'invalid' };

export interface CreateUserPayload {
    telegramId: number;
    phone: string;
    firstName: string;
    lastName: string;
    region: string;
    district: string;
    username?: string;
    language?: string;
}

export interface CreateReviewPurchasePayload {
    userId: number;
    productId: number;
    quantity: number;
    bonus: number;
    proofImage: string;
    reviewNote?: string;
}

@Injectable()
export class BotService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Purchase)
        private readonly purchaseRepo: Repository<Purchase>,
        @InjectRepository(GiftPurchase)
        private readonly giftPurchaseRepo: Repository<GiftPurchase>,
        private readonly dataSource: DataSource,
    ) {}

    findByPhone(phone: string) {
        return this.userRepo.findOne({ where: { phone } });
    }

    findByTelegramId(telegramId: number) {
        return this.userRepo.findOne({ where: { telegramId } });
    }

    async createUser(payload: CreateUserPayload) {
        const user = this.userRepo.create(payload);
        return this.userRepo.save(user);
    }

    async updateTelegramId(phone: string, telegramId: number) {
        await this.userRepo.update({ phone }, { telegramId });
        return this.userRepo.findOne({ where: { phone } });
    }

    async updateLanguage(telegramId: number, language: string) {
        await this.userRepo.update({ telegramId }, { language });
    }

    /**
     * Kodni tasdiqlash (avtomatik): kodni tekshiradi, ishlatilgan deb belgilaydi,
     * tasdiqlangan xarid yaratadi va bonusni QO'SHADI — BARCHASI BITTA transaction.
     * Bonus = kodning ballidan (points). Race'ga qarshi pessimistic lock.
     */
    async redeemCode(telegramId: number, codeStr: string): Promise<RedeemResult> {
        const code = (codeStr ?? '').trim().toUpperCase();
        const user = await this.findByTelegramId(telegramId);
        if (!user) return { ok: false, reason: 'not_registered' };

        return this.dataSource.transaction(async (em) => {
            const rec = await em.findOne(Code, {
                where: { code },
                lock: { mode: 'pessimistic_write' },
            });
            if (!rec) return { ok: false, reason: 'invalid' } as RedeemResult;
            if (rec.isUsed) return { ok: false, reason: 'invalid' } as RedeemResult;
            if (new Date(rec.expiresAt).getTime() < Date.now()) {
                return { ok: false, reason: 'invalid' } as RedeemResult;
            }

            // Kodni ishlatilgan deb belgilaymiz
            rec.isUsed = true;
            rec.usedByUserId = user.id;
            rec.usedAt = new Date();
            await em.save(rec);

            // Tasdiqlangan xarid yozuvi (admin panelda ko'rinadi, user /orders da ko'radi)
            await em.insert(Purchase, {
                userId: user.id,
                productId: rec.productId && rec.productId > 0 ? rec.productId : null,
                quantity: 1,
                bonus: rec.points,
                status: 'approved',
                reviewSubmitted: false,
                proofImage: '',
                reviewNote: `Kod: ${rec.code}`,
                reviewedAt: new Date(),
            });

            // Bonusni qo'shamiz
            if (rec.points > 0) {
                await em.increment(User, { id: user.id }, 'bonus', rec.points);
            }

            const product = rec.productId
                ? await em.findOne(Product, { where: { id: rec.productId } })
                : null;

            return {
                ok: true,
                points: rec.points,
                newBonus: user.bonus + rec.points,
                productTitle: product?.title ?? '',
            } as RedeemResult;
        });
    }

    /**
     * Sovg'a sotib olish: bonusni atomik yechish + sovg'a yozuvini yaratish —
     * BITTA transaction. Bonus yetarsiz bo'lsa null qaytaradi (hech narsa o'zgarmaydi).
     * Agar yozuv yaratishda xato bo'lsa, bonus ham qaytariladi (rollback).
     */
    async purchaseGift(telegramId: number, gift: { id: number; price: number }) {
        return this.dataSource.transaction(async (em) => {
            const result = await em
                .createQueryBuilder()
                .update(User)
                .set({ bonus: () => '"bonus" - :price' })
                .setParameter('price', gift.price)
                .where('"telegramId" = :telegramId AND "bonus" >= :price', {
                    telegramId,
                    price: gift.price,
                })
                .returning('*')
                .execute();

            if (!result.affected) return null;
            const user = result.raw[0] as User;

            await em.insert(GiftPurchase, {
                userId: user.id,
                giftId: gift.id,
                price: gift.price,
            });
            return user;
        });
    }

    findPendingPurchase(userId: number, productId: number) {
        return this.purchaseRepo.findOne({ where: { userId, productId, status: 'pending' } });
    }

    createReviewPurchase(payload: CreateReviewPurchasePayload) {
        const purchase = this.purchaseRepo.create({
            userId: payload.userId,
            productId: payload.productId,
            quantity: payload.quantity,
            bonus: payload.bonus,
            status: 'pending',
            reviewSubmitted: true,
            proofImage: payload.proofImage,
            reviewNote: payload.reviewNote ?? '',
        });
        return this.purchaseRepo.save(purchase);
    }

    /** Kodli xarid: tasdiqlangan holda yaratadi va bonusni darhol qo'shadi (bitta transaction). */
    async createApprovedPurchase(payload: CreateReviewPurchasePayload): Promise<User> {
        return this.dataSource.transaction(async (em) => {
            await em.insert(Purchase, {
                userId: payload.userId,
                productId: payload.productId,
                quantity: payload.quantity,
                bonus: payload.bonus,
                status: 'approved',
                reviewSubmitted: true,
                proofImage: payload.proofImage,
                reviewNote: payload.reviewNote ?? '',
                reviewedAt: new Date(),
            });
            if (payload.bonus > 0) {
                await em.increment(User, { id: payload.userId }, 'bonus', payload.bonus);
            }
            return em.findOne(User, { where: { id: payload.userId } }) as Promise<User>;
        });
    }

    async findUserOrdersPage(userId: number, page: number, size = 5) {
        const filter = { userId, status: 'approved' as const };
        const total = await this.purchaseRepo.count({ where: filter });
        const totalPages = Math.max(1, Math.ceil(total / size));
        const safePage = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
        const items = await this.purchaseRepo.find({
            where: filter,
            order: { createdAt: 'DESC' },
            skip: safePage * size,
            take: size,
            relations: ['product'],
        });
        return { items, total, totalPages, page: safePage };
    }

    findUserGiftPurchases(userId: number) {
        return this.giftPurchaseRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            relations: ['gift'],
        });
    }

    static normalizePhone(raw: string): string {
        const digits = (raw || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.startsWith('998') && digits.length === 12) {
            return `+${digits}`;
        }
        if (!digits.startsWith('998') && digits.length === 9) {
            return `+998${digits}`;
        }
        return '';
    }

    static isValidUzbekPhone(phone: string): boolean {
        return /^\+998\d{9}$/.test(phone);
    }
}
