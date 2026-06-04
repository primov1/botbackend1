import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Gift } from '../common/entities/gift.entity';

@Injectable()
export class BotCatalogService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        @InjectRepository(Gift)
        private readonly giftRepo: Repository<Gift>,
    ) {}

    async findProductsPage(page: number, size = 5) {
        const total = await this.productRepo.count();
        const totalPages = Math.max(1, Math.ceil(total / size));
        const safePage = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
        const items = await this.productRepo.find({
            order: { createdAt: 'DESC' },
            skip: safePage * size,
            take: size,
        });
        return { items, total, totalPages, page: safePage };
    }

    findProductById(id: number) {
        if (!id || isNaN(id)) return null;
        return this.productRepo.findOne({ where: { id } });
    }

    async findGiftsPage(page: number, size = 5) {
        const total = await this.giftRepo.count();
        const totalPages = Math.max(1, Math.ceil(total / size));
        const safePage = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
        const items = await this.giftRepo.find({
            order: { createdAt: 'DESC' },
            skip: safePage * size,
            take: size,
        });
        return { items, total, totalPages, page: safePage };
    }

    findGiftById(id: number) {
        if (!id || isNaN(id)) return null;
        return this.giftRepo.findOne({ where: { id } });
    }

    /** Profil uchun — barcha sovg'alar, narxi bo'yicha o'sish tartibida. */
    findAllGiftsByPrice() {
        return this.giftRepo.find({ order: { price: 'ASC' } });
    }
}
