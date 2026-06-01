import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import LocalSession from 'telegraf-session-local';
import { BotModule } from './bot/bot.module';
import { User } from './common/entities/user.entity';
import { Product } from './common/entities/product.entity';
import { Gift } from './common/entities/gift.entity';
import { Purchase } from './common/entities/purchase.entity';
import { GiftPurchase } from './common/entities/gift-purchase.entity';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', ''),
                database: config.get<string>('DB_NAME', 'bot_loyiha'),
                entities: [User, Product, Gift, Purchase, GiftPurchase],
                synchronize: config.get<string>('NODE_ENV') !== 'production',
                logging: config.get<string>('NODE_ENV') === 'development',
            }),
        }),
        TelegrafModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                token: config.get<string>('BOT_TOKEN') ?? '',
                middlewares: [new LocalSession({ database: 'sessions.json' }).middleware()],
            }),
        }),
        BotModule,
    ],
})
export class AppModule {}
