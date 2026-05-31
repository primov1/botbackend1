import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { Purchase } from '../common/entities/purchase.entity';
import { GiftPurchase } from '../common/entities/gift-purchase.entity';

export interface CreateUserPayload {
    telegramId: number;
    phone: string;
    firstName: string;
    lastName: string;
    region: string;
    district: string;
}

export interface CreateReviewPurchasePayload {
    userId: number;
    productId: number;
    bonus: number;
    proofImage: string;
}

export interface CreateGiftPurchasePayload {
    userId: number;
    giftId: number;
    price: number;
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

    async deductBonus(telegramId: number, amount: number) {
        const user = await this.userRepo.findOne({ where: { telegramId } });
        if (!user || user.bonus < amount) return null;
        user.bonus -= amount;
        return this.userRepo.save(user);
    }

    createReviewPurchase(payload: CreateReviewPurchasePayload) {
        const purchase = this.purchaseRepo.create({
            userId: payload.userId,
            productId: payload.productId,
            bonus: payload.bonus,
            status: 'pending',
            reviewSubmitted: true,
            proofImage: payload.proofImage,
        });
        return this.purchaseRepo.save(purchase);
    }

    createGiftPurchase(payload: CreateGiftPurchasePayload) {
        const gp = this.giftPurchaseRepo.create({
            userId: payload.userId,
            giftId: payload.giftId,
            price: payload.price,
        });
        return this.giftPurchaseRepo.save(gp);
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
