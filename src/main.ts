import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    await NestFactory.createApplicationContext(AppModule);
    console.log('Telegram bot ishga tushdi (polling).');
}
bootstrap();
