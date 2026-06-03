import { Logger } from '@nestjs/common';
import { Action, Command, Ctx as TelegrafCtx, Hears, Start, Update } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService } from './bot.service';
import { BotCatalogService } from './bot-catalog.service';
import {
    MENU_GIFTS_ALL, MENU_REVIEW_ALL,
    languageKeyboard, mainMenuKeyboard,
} from './keyboards';
import { Lang, normalizeLang, t } from './i18n';
import { REGISTRATION_SCENE } from './scenes/registration.scene';
import { REVIEW_SCENE } from './scenes/review.scene';

interface CatalogSession {
    productMsgIds?: number[];
    giftMsgIds?: number[];
}

type BotCtx = Scenes.SceneContext & { match?: RegExpExecArray };

const PAGE_SIZE = 5;

@Update()
export class BotUpdate {
    private readonly logger = new Logger(BotUpdate.name);

    constructor(
        private readonly botService: BotService,
        private readonly catalogService: BotCatalogService,
    ) {}

    /** Joriy foydalanuvchi tilini oladi (default uz). */
    private async langOf(telegramId?: number): Promise<Lang> {
        if (!telegramId) return 'uz';
        const user = await this.botService.findByTelegramId(telegramId);
        return normalizeLang(user?.language);
    }

    @Start()
    async onStart(@TelegrafCtx() ctx: BotCtx) {
        // Har doim avval til tanlash ko'rsatiladi
        await ctx.reply(t('uz', 'choose_language'), languageKeyboard);
    }

    @Action(/^setlang:(uz|ru|en)$/)
    async onSetLang(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const lang = (ctx.match?.[1] ?? 'uz') as Lang;
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const existing = await this.botService.findByTelegramId(telegramId);
        if (existing) {
            await this.botService.updateLanguage(telegramId, lang);
            await ctx.reply(
                t(lang, 'welcome_back', { name: existing.firstName, bonus: existing.bonus }),
                mainMenuKeyboard(lang),
            );
            return;
        }

        await ctx.scene.enter(REGISTRATION_SCENE, { lang });
    }

    @Command('balance')
    async onBalance(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'));
            return;
        }

        await ctx.reply(t(lang, 'balance', { bonus: user.bonus }), mainMenuKeyboard(lang));
    }

    @Command('orders')
    async onOrders(@TelegrafCtx() ctx: BotCtx) {
        await this.sendOrdersPage(ctx, 0, false);
    }

    @Action(/^orderpage:(\d+)$/)
    async onOrderPage(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const page = Number(ctx.match?.[1] ?? 0);
        await this.sendOrdersPage(ctx, page, true);
    }

    @Command('gifts')
    async onMyGifts(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'));
            return;
        }

        const gifts = await this.botService.findUserGiftPurchases(user.id);
        if (gifts.length === 0) {
            await ctx.reply(t(lang, 'no_gifts'), mainMenuKeyboard(lang));
            return;
        }

        const lines = gifts.map(
            (g: any, i) => `${i + 1}. ${g.gift?.title ?? t(lang, 'deleted_gift')}`,
        );
        await ctx.reply(
            t(lang, 'my_gifts_header', { count: gifts.length, list: lines.join('\n') }),
            mainMenuKeyboard(lang),
        );
    }

    @Hears(MENU_REVIEW_ALL)
    async onReviewMenu(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'));
            return;
        }

        const { total } = await this.catalogService.findProductsPage(0, PAGE_SIZE);
        if (total === 0) {
            await ctx.reply(t(lang, 'no_products'), mainMenuKeyboard(lang));
            return;
        }

        await ctx.reply(t(lang, 'products_header', { total }), mainMenuKeyboard(lang));
        await this.sendProductPage(ctx, 0, lang);
    }

    @Action(/^prodpage:(\d+)$/)
    async onProductPage(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const lang = await this.langOf(ctx.from?.id);
        const page = Number(ctx.match?.[1] ?? 0);
        await this.sendProductPage(ctx, page, lang);
    }

    @Hears(MENU_GIFTS_ALL)
    async onGiftsMenu(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'));
            return;
        }

        const { total } = await this.catalogService.findGiftsPage(0, PAGE_SIZE);
        if (total === 0) {
            await ctx.reply(t(lang, 'no_gifts_available'), mainMenuKeyboard(lang));
            return;
        }

        await ctx.reply(
            t(lang, 'gifts_header', { total, bonus: user.bonus }),
            mainMenuKeyboard(lang),
        );
        await this.sendGiftPage(ctx, 0, lang);
    }

    @Action(/^giftpage:(\d+)$/)
    async onGiftPage(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const lang = await this.langOf(ctx.from?.id);
        const page = Number(ctx.match?.[1] ?? 0);
        await this.sendGiftPage(ctx, page, lang);
    }

    private async sendProductPage(ctx: BotCtx, page: number, lang: Lang) {
        const session = this.getSession(ctx);
        const { items, totalPages, page: safePage } =
            await this.catalogService.findProductsPage(page, PAGE_SIZE);

        await this.deleteTracked(ctx, session.productMsgIds);

        const msgIds: number[] = [];
        for (const product of items) {
            const inline = Markup.inlineKeyboard([
                [Markup.button.callback(t(lang, 'btn_select_product'), `review:${String(product.id)}`)],
            ]);
            const id = await this.sendItem(ctx, product.image, product.title, inline, String(product.id));
            if (id) msgIds.push(id);
        }

        const navMsg = await ctx.reply(
            t(lang, 'page', { page: safePage + 1, total: totalPages }),
            this.buildNav('prodpage', safePage, totalPages, lang),
        );
        msgIds.push(navMsg.message_id);
        session.productMsgIds = msgIds;
    }

    private async sendGiftPage(ctx: BotCtx, page: number, lang: Lang) {
        const session = this.getSession(ctx);
        const { items, totalPages, page: safePage } =
            await this.catalogService.findGiftsPage(page, PAGE_SIZE);

        await this.deleteTracked(ctx, session.giftMsgIds);

        const msgIds: number[] = [];
        for (const gift of items) {
            const caption = t(lang, 'gift_caption', { title: gift.title, price: gift.price });
            const inline = Markup.inlineKeyboard([
                [Markup.button.callback(t(lang, 'btn_exchange'), `gift:${String(gift.id)}`)],
            ]);
            const id = await this.sendItem(ctx, gift.image, caption, inline, String(gift.id));
            if (id) msgIds.push(id);
        }

        const navMsg = await ctx.reply(
            t(lang, 'page', { page: safePage + 1, total: totalPages }),
            this.buildNav('giftpage', safePage, totalPages, lang),
        );
        msgIds.push(navMsg.message_id);
        session.giftMsgIds = msgIds;
    }

    private async sendOrdersPage(ctx: BotCtx, page: number, edit: boolean) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'));
            return;
        }

        const { items, total, totalPages, page: safePage } =
            await this.botService.findUserOrdersPage(user.id, page, PAGE_SIZE);

        if (total === 0) {
            await ctx.reply(t(lang, 'no_orders'), mainMenuKeyboard(lang));
            return;
        }

        const lines = items.map(
            (p: any, i) =>
                `${safePage * PAGE_SIZE + i + 1}. ${p.product?.title ?? t(lang, 'deleted_product')}`,
        );
        const text =
            `${t(lang, 'orders_header', { total })}\n\n` +
            `${lines.join('\n')}\n\n` +
            `${t(lang, 'page', { page: safePage + 1, total: totalPages })}`;
        const nav = this.buildNav('orderpage', safePage, totalPages, lang);

        if (edit) {
            await ctx.editMessageText(text, nav).catch(() => undefined);
        } else {
            await ctx.reply(text, nav);
        }
    }

    private async sendItem(
        ctx: BotCtx,
        image: string | undefined,
        caption: string,
        inline: ReturnType<typeof Markup.inlineKeyboard>,
        itemId: string,
    ): Promise<number | undefined> {
        try {
            if (image) {
                const msg = await ctx.replyWithPhoto(image, { caption, ...inline });
                return msg.message_id;
            }
            const msg = await ctx.reply(caption, inline);
            return msg.message_id;
        } catch (err) {
            this.logger.warn(`Element yuborilmadi (${itemId}): ${(err as Error).message}`);
            try {
                const msg = await ctx.reply(caption, inline);
                return msg.message_id;
            } catch (fallbackErr) {
                this.logger.error(`Fallback ham yuborilmadi (${itemId}): ${(fallbackErr as Error).message}`);
                return undefined;
            }
        }
    }

    private buildNav(prefix: string, page: number, totalPages: number, lang: Lang) {
        const row: ReturnType<typeof Markup.button.callback>[] = [];
        if (page > 0) {
            row.push(Markup.button.callback(t(lang, 'btn_back'), `${prefix}:${page - 1}`));
        }
        if (page < totalPages - 1) {
            row.push(Markup.button.callback(t(lang, 'btn_next'), `${prefix}:${page + 1}`));
        }
        return Markup.inlineKeyboard(row.length ? [row] : []);
    }

    private async deleteTracked(ctx: BotCtx, ids?: number[]) {
        if (!ids?.length) return;
        for (const id of ids) {
            await ctx.deleteMessage(id).catch(() => undefined);
        }
    }

    private getSession(ctx: BotCtx): CatalogSession {
        return ctx.session as unknown as CatalogSession;
    }

    @Action(/^review:(\d+)$/)
    async onReviewProduct(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const productId = ctx.match?.[1];
        if (!productId) return;

        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'));
            return;
        }

        await ctx.scene.enter(REVIEW_SCENE, { productId });
    }

    @Action(/^gift:(\d+)$/)
    async onGiftBuy(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);

        const giftId = Number(ctx.match?.[1]);
        if (!giftId) return;

        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        const lang = normalizeLang(user?.language);
        if (!user) {
            await ctx.reply(t(lang, 'register_first'), mainMenuKeyboard(lang));
            return;
        }

        const gift = await this.catalogService.findGiftById(giftId);
        if (!gift) {
            await ctx.reply(t(lang, 'gift_not_found'), mainMenuKeyboard(lang));
            return;
        }

        const updated = await this.botService.purchaseGift(telegramId, { id: gift.id, price: gift.price });
        if (!updated) {
            await ctx.reply(
                t(lang, 'not_enough_bonus', { have: user.bonus, need: gift.price }),
                mainMenuKeyboard(lang),
            );
            return;
        }

        await ctx.reply(
            t(lang, 'gift_requested', { title: gift.title, price: gift.price, bonus: updated.bonus }),
            mainMenuKeyboard(lang),
        );
    }
}
