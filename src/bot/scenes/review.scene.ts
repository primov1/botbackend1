import { Logger } from '@nestjs/common';
import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService } from '../bot.service';
import { BotCatalogService } from '../bot-catalog.service';
import {
    REVIEW_CANCEL, REVIEW_CONFIRM,
    cancelOnlyKeyboard, mainMenuKeyboard, reviewConfirmKeyboard,
} from '../keyboards';

export const REVIEW_SCENE = 'REVIEW_SCENE';

interface ReviewState {
    productId?: number;
}

type WizardCtx = Scenes.WizardContext;

@Wizard(REVIEW_SCENE)
export class ReviewScene {
    private readonly logger = new Logger(ReviewScene.name);

    constructor(
        private readonly catalogService: BotCatalogService,
        private readonly botService: BotService,
    ) {}

    @WizardStep(1)
    async start(@Ctx() ctx: WizardCtx) {
        const enterState = (ctx.scene.state as ReviewState) || {};
        const productId = Number(enterState.productId);

        if (!productId) {
            await ctx.reply('Mahsulot tanlanmadi.', mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }

        const product = await this.catalogService.findProductById(productId);
        if (!product) {
            await ctx.reply('Mahsulot topilmadi.', mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }

        (ctx.wizard.state as ReviewState).productId = productId;

        const linkButtons: any[][] = [
            [Markup.button.url('🍇 Uzum Marketga o\'tish', product.uzum_url)],
        ];

        if (product.telegramChannel) {
            linkButtons.push([
                Markup.button.url('📢 Telegram kanalga obuna bo\'lish', product.telegramChannel),
            ]);
        }

        if (product.instagram) {
            linkButtons.push([
                Markup.button.url('📸 Instagram sahifaga o\'tish', product.instagram),
            ]);
        }

        await ctx.reply(
            `📦 <b>${product.title}</b>\n\n` +
            `🎁 Xarid uchun bonus: <b>+${product.bonus}</b>\n\n` +
            (product.requireChannel && (product.telegramChannel || product.instagram)
                ? `⚠️ <b>Diqqat!</b> Bonus olish uchun quyidagi kanal/sahifaga obuna bo'ling:\n`
                : '') +
            `Mahsulotni sotib olgach chek rasmini yuboring 👇`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(linkButtons),
            },
        );

        await ctx.reply(
            "Ushbu mahsulotni sotib olgan bo'lsangiz Tasdiqlash tugmasini bosing. 👇",
            reviewConfirmKeyboard,
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    async waitForConfirm(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (text === REVIEW_CANCEL) {
            await ctx.reply('Bekor qilindi.', mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }

        if (text !== REVIEW_CONFIRM) {
            await ctx.reply('Iltimos, pastdagi tugmani bosing.', reviewConfirmKeyboard);
            return;
        }

        await ctx.reply('Bonus hisoblash uchun chek rasmini yuboring 📸', cancelOnlyKeyboard);
        ctx.wizard.next();
    }

    @WizardStep(3)
    async waitForPhoto(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (text === REVIEW_CANCEL) {
            await ctx.reply('Bekor qilindi.', mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }

        const photos: any[] = Array.isArray(message?.photo) ? message.photo : [];
        if (photos.length === 0) {
            await ctx.reply(
                'Iltimos, chek RASMINI yuboring (matn yoki fayl emas).',
                cancelOnlyKeyboard,
            );
            return;
        }

        const productId = (ctx.wizard.state as ReviewState).productId;
        const telegramId = ctx.from?.id;

        if (!productId || !telegramId) {
            await ctx.reply('Xatolik yuz berdi.', mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }

        const [product, user] = await Promise.all([
            this.catalogService.findProductById(productId),
            this.botService.findByTelegramId(telegramId),
        ]);

        if (!product) {
            await ctx.reply('Mahsulot topilmadi.', mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start", mainMenuKeyboard);
            await ctx.scene.leave();
            return;
        }

        const fileId = photos[photos.length - 1].file_id as string;
        let proofImage = '';
        try {
            const link = await ctx.telegram.getFileLink(fileId);
            proofImage = typeof link === 'string' ? link : link.href;
        } catch (err) {
            this.logger.warn(`Rasm havolasini olib bo'lmadi: ${(err as Error).message}`);
        }

        await this.botService.createReviewPurchase({
            userId: user.id,
            productId: product.id,
            bonus: product.bonus,
            proofImage,
        });

        const channelNote = product.requireChannel && (product.telegramChannel || product.instagram)
            ? `\n⚠️ Eslatma: Kanalga obuna bo'lmagan bo'lsangiz bonus tasdiqlanmasligi mumkin.`
            : '';

        await ctx.reply(
            `✅ Tekshirish uchun qabul qilindi!\n` +
            `⏳ Tasdiqlangach hisobingizga qo'shiladi.\n` +
            `🎁 Xarid uchun bonus: +${product.bonus}${channelNote}`,
            mainMenuKeyboard,
        );
        await ctx.scene.leave();
    }
}
