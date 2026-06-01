import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getBotToken } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { AppModule } from './app.module';
import { validateEnv } from './common/env.validation';

async function bootstrap() {
    // Majburiy env'larni boot'da tekshiramiz (bo'lmasa aniq xato bilan to'xtaymiz)
    validateEnv();

    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // SIGTERM (Railway redeploy) da bot/DB toza yopilsin
    app.enableShutdownHooks();

    // Bitta handler xatosi butun botni yiqitmasin
    const bot = app.get<Telegraf>(getBotToken());
    bot.catch((err, ctx) => {
        logger.error(
            `Bot xato (update ${ctx.update?.update_id ?? '?'}): ${(err as Error).message}`,
        );
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Server ${port} portda ishlamoqda`);
    logger.log('Telegram bot ishga tushdi (polling).');
}
bootstrap();
