import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { DataSource } from 'typeorm';
import { BotModule } from './bot/bot.module';
import { User } from './common/entities/user.entity';
import { Product } from './common/entities/product.entity';
import { Gift } from './common/entities/gift.entity';
import { Purchase } from './common/entities/purchase.entity';
import { GiftPurchase } from './common/entities/gift-purchase.entity';
import { PgSessionStore } from './common/pg-session.store';
import { SchemaBootstrapService } from './common/schema-bootstrap.service';
import { HealthController } from './health/health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const url = config.get<string>('DATABASE_URL');
                const ssl =
                    config.get<string>('DB_SSL') === 'true'
                        ? { rejectUnauthorized: false }
                        : false;
                const base = {
                    type: 'postgres' as const,
                    entities: [User, Product, Gift, Purchase, GiftPurchase],
                    synchronize: config.get<string>('NODE_ENV') !== 'production',
                    logging: config.get<string>('NODE_ENV') === 'development',
                    ssl,
                };
                return url
                    ? { ...base, url }
                    : {
                          ...base,
                          host: config.get<string>('DB_HOST', 'localhost'),
                          port: config.get<number>('DB_PORT', 5432),
                          username: config.get<string>('DB_USERNAME', 'postgres'),
                          password: config.get<string>('DB_PASSWORD', ''),
                          database: config.get<string>('DB_NAME', 'bot_loyiha'),
                      };
            },
        }),
        TelegrafModule.forRootAsync({
            inject: [ConfigService, DataSource],
            useFactory: (config: ConfigService, dataSource: DataSource) => ({
                token: config.get<string>('BOT_TOKEN') ?? '',
                // Fayl (sessions.json) o'rniga Postgres-asosli sessiya — Railway
                // redeploy/restart'da scene/wizard holati yo'qolmaydi.
                middlewares: [
                    session({
                        store: new PgSessionStore(dataSource),
                        defaultSession: () => ({}),
                    }),
                ],
            }),
        }),
        BotModule,
    ],
    controllers: [HealthController],
    providers: [SchemaBootstrapService],
})
export class AppModule {}
