import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService } from '../bot.service';
import { BotCatalogService } from '../bot-catalog.service';
import { ImageUploadService } from '../../common/image-upload.service';
import { escapeHtml, isValidButtonUrl } from '../../common/telegram.util';
import {
    cancelOnlyKeyboard, mainMenuKeyboard, reviewConfirmKeyboard,
    isReviewCancel, isReviewConfirm,
} from '../keyboards';
import { Lang, normalizeLang, t } from '../i18n';

export const REVIEW_SCENE = 'REVIEW_SCENE';

interface ReviewState {
    productId?: number;
    lang?: Lang;
}

type WizardCtx = Scenes.WizardContext;

@Injectable()
@Wizard(REVIEW_SCENE)
export class ReviewScene {
    private readonly logger = new Logger(ReviewScene.name);

    constructor(
        private readonly catalogService: BotCatalogService,
        private readonly botService: BotService,
        private readonly imageUpload: ImageUploadService,
    ) {}

    private lang(ctx: WizardCtx): Lang {
        return (ctx.wizard.state as ReviewState).lang ?? 'uz';
    }

    @WizardStep(1)
    async start(@Ctx() ctx: WizardCtx) {
        const enterState = (ctx.scene.state as ReviewState) || {};
        const productId = Number(enterState.productId);

        // Foydalanuvchi tilini aniqlab, wizard state'ga saqlaymiz
        const user = await this.botService.findByTelegramId(ctx.from?.id ?? 0);
        const lang = normalizeLang(user?.language);
        (ctx.wizard.state as ReviewState).lang = lang;

        if (!productId) {
            await ctx.reply(t(lang, 'product_not_selected'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const product = await this.catalogService.findProductById(productId);
        if (!product) {
            await ctx.reply(t(lang, 'product_not_found'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        (ctx.wizard.state as ReviewState).productId = productId;

        const linkButtons: any[][] = [];
        if (isValidButtonUrl(product.uzum_url)) {
            linkButtons.push([Markup.button.url(t(lang, 'btn_uzum'), product.uzum_url)]);
        }
        if (isValidButtonUrl(product.telegramChannel)) {
            linkButtons.push([Markup.button.url(t(lang, 'btn_telegram'), product.telegramChannel)]);
        }
        if (isValidButtonUrl(product.instagram)) {
            linkButtons.push([Markup.button.url(t(lang, 'btn_instagram'), product.instagram)]);
        }

        const channelWarn =
            product.requireChannel && (product.telegramChannel || product.instagram)
                ? t(lang, 'channel_warning')
                : '';

        try {
            await ctx.reply(
                t(lang, 'product_info', {
                    title: escapeHtml(product.title),
                    bonus: product.bonus,
                    channelWarn,
                }),
                { parse_mode: 'HTML', ...Markup.inlineKeyboard(linkButtons) },
            );
        } catch (err) {
            this.logger.warn(`Mahsulot xabarini HTML bilan yuborib bo'lmadi: ${(err as Error).message}`);
            await ctx.reply(
                t(lang, 'product_info_plain', { title: product.title, bonus: product.bonus }),
            );
        }

        await ctx.reply(t(lang, 'press_confirm'), reviewConfirmKeyboard(lang));
        ctx.wizard.next();
    }

    @WizardStep(2)
    async waitForConfirm(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (isReviewCancel(text)) {
            await ctx.reply(t(lang, 'canceled'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        if (!isReviewConfirm(text)) {
            await ctx.reply(t(lang, 'please_press_button'), reviewConfirmKeyboard(lang));
            return;
        }

        await ctx.reply(t(lang, 'send_proof'), cancelOnlyKeyboard(lang));
        ctx.wizard.next();
    }

    @WizardStep(3)
    async waitForPhoto(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (isReviewCancel(text)) {
            await ctx.reply(t(lang, 'canceled'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const photos: any[] = Array.isArray(message?.photo) ? message.photo : [];
        if (photos.length === 0) {
            await ctx.reply(t(lang, 'please_send_photo'), cancelOnlyKeyboard(lang));
            return;
        }

        const productId = (ctx.wizard.state as ReviewState).productId;
        const telegramId = ctx.from?.id;

        if (!productId || !telegramId) {
            await ctx.reply(t(lang, 'error_occurred'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const [product, user] = await Promise.all([
            this.catalogService.findProductById(productId),
            this.botService.findByTelegramId(telegramId),
        ]);

        if (!product) {
            await ctx.reply(t(lang, 'product_not_found'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }
        if (!user) {
            await ctx.reply(t(lang, 'register_first'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const existing = await this.botService.findPendingPurchase(user.id, product.id);
        if (existing) {
            await ctx.reply(t(lang, 'already_pending'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const fileId = photos[photos.length - 1].file_id as string;
        let proofImage = '';
        try {
            const link = await ctx.telegram.getFileLink(fileId);
            const telegramUrl = typeof link === 'string' ? link : link.href;
            const hosted = await this.imageUpload.uploadFromUrl(telegramUrl);
            proofImage = hosted ?? telegramUrl;
        } catch (err) {
            this.logger.warn(`Rasm havolasini olib bo'lmadi: ${(err as Error).message}`);
        }

        await this.botService.createReviewPurchase({
            userId: user.id,
            productId: product.id,
            bonus: product.bonus,
            proofImage,
        });

        const channelNote =
            product.requireChannel && (product.telegramChannel || product.instagram)
                ? t(lang, 'channel_note')
                : '';

        await ctx.reply(
            t(lang, 'review_accepted', { bonus: product.bonus, channelNote }),
            mainMenuKeyboard(lang),
        );
        await ctx.scene.leave();
    }
}
