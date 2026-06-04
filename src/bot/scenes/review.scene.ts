import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService } from '../bot.service';
import { BotCatalogService } from '../bot-catalog.service';
import { ImageUploadService } from '../../common/image-upload.service';
import { CodesService } from '../codes.service';
import { escapeHtml, isValidButtonUrl } from '../../common/telegram.util';
import {
    cancelOnlyKeyboard, mainMenuKeyboard, reviewConfirmKeyboard,
    isReviewCancel, isReviewConfirm,
} from '../keyboards';
import { Lang, normalizeLang, t } from '../i18n';

export const REVIEW_SCENE = 'REVIEW_SCENE';

interface ReviewState {
    productId?: number;
    quantity?: number;
    lang?: Lang;
    fromCode?: boolean;
    code?: string;
    codeId?: number;
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
        private readonly codesService: CodesService,
    ) {}

    private lang(ctx: WizardCtx): Lang {
        return (ctx.wizard.state as ReviewState).lang ?? 'uz';
    }

    @WizardStep(1)
    async start(@Ctx() ctx: WizardCtx) {
        const enterState = (ctx.scene.state as ReviewState) || {};
        let productId = Number(enterState.productId);

        // Foydalanuvchi tilini aniqlab, wizard state'ga saqlaymiz
        const user = await this.botService.findByTelegramId(ctx.from?.id ?? 0);
        const lang = normalizeLang(user?.language);
        (ctx.wizard.state as ReviewState).lang = lang;

        // KOD REJIMI (QR-2): kodni tekshirib, mahsulotni aniqlaymiz
        const fromCode = !!enterState.fromCode;
        if (fromCode && enterState.code) {
            const codeRec = await this.codesService.validate(enterState.code);
            if (!codeRec) {
                await ctx.reply(t(lang, 'code_invalid'), mainMenuKeyboard(lang));
                await ctx.scene.leave();
                return;
            }
            productId = codeRec.productId;
            (ctx.wizard.state as ReviewState).codeId = codeRec.id;
            (ctx.wizard.state as ReviewState).fromCode = true;
            (ctx.wizard.state as ReviewState).quantity = 1; // kod = 1 dona
        }

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

        // KOD REJIMIDA: tasdiqlash/miqdorni o'tkazib, to'g'ridan chek yuklashga
        if (fromCode) {
            await ctx.reply(t(lang, 'send_proof'), cancelOnlyKeyboard(lang));
            ctx.wizard.selectStep(3); // WizardStep(4) = chek rasmi (index 3)
            return;
        }

        await ctx.reply(t(lang, 'ask_quantity'), cancelOnlyKeyboard(lang));
        ctx.wizard.selectStep(2); // WizardStep(3) = miqdor
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

        // Avval nechta dona olganini so'raymiz
        await ctx.reply(t(lang, 'ask_quantity'), cancelOnlyKeyboard(lang));
        ctx.wizard.next();
    }

    @WizardStep(3)
    async waitForQuantity(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (isReviewCancel(text)) {
            await ctx.reply(t(lang, 'canceled'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const qty = Number(text);
        if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
            await ctx.reply(t(lang, 'invalid_quantity'), cancelOnlyKeyboard(lang));
            return;
        }

        (ctx.wizard.state as ReviewState).quantity = qty;
        await ctx.reply(t(lang, 'send_proof'), cancelOnlyKeyboard(lang));
        ctx.wizard.next();
    }

    @WizardStep(4)
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

        const quantity = (ctx.wizard.state as ReviewState).quantity ?? 1;
        const totalBonus = product.bonus * quantity;

        await this.botService.createReviewPurchase({
            userId: user.id,
            productId: product.id,
            quantity,
            bonus: totalBonus,
            proofImage,
        });

        // KOD REJIMI: kodni ishlatilgan deb belgilaymiz (qayta ishlatilmasin)
        const codeId = (ctx.wizard.state as ReviewState).codeId;
        if (codeId) {
            await this.codesService.markUsed(codeId, user.id);
        }

        const channelNote =
            product.requireChannel && (product.telegramChannel || product.instagram)
                ? t(lang, 'channel_note')
                : '';

        await ctx.reply(
            t(lang, 'review_accepted', { bonus: totalBonus, channelNote }),
            mainMenuKeyboard(lang),
        );
        await ctx.scene.leave();
    }
}
