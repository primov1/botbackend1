import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { BotCatalogService } from './bot-catalog.service';
import { RegionsService } from './regions.service';
import { RegistrationScene } from './scenes/registration.scene';
import { ReviewScene } from './scenes/review.scene';
import { User } from '../common/entities/user.entity';
import { Product } from '../common/entities/product.entity';
import { Gift } from '../common/entities/gift.entity';
import { Purchase } from '../common/entities/purchase.entity';
import { GiftPurchase } from '../common/entities/gift-purchase.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Product, Gift, Purchase, GiftPurchase]),
    ],
    providers: [
        BotService,
        BotCatalogService,
        RegionsService,
        BotUpdate,
        RegistrationScene,
        ReviewScene,
    ],
})
export class BotModule {}
