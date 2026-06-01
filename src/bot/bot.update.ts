import { Logger } from '@nestjs/common';
import { Action, Command, Ctx as TelegrafCtx, Hears, Start, Update } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService } from './bot.service';
import { BotCatalogService } from './bot-catalog.service';
import { MENU_GIFTS, MENU_REVIEW, mainMenuKeyboard } from './keyboards';
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

    @Start()
    async onStart(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const existing = await this.botService.findByTelegramId(telegramId);
        if (existing) {
            await ctx.reply(
                `Xush kelibsiz, ${existing.firstName}! 👋\n💰 Bonus hisobingiz: ${existing.bonus}`,
                mainMenuKeyboard,
            );
            return;
        }

        await ctx.scene.enter(REGISTRATION_SCENE);
    }

    @Command('balance')
    async onBalance(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start");
            return;
        }

        await ctx.reply(
            `💰 Bonus hisobingiz: ${user.bonus} ball`,
            mainMenuKeyboard,
        );
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
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start");
            return;
        }

        const gifts = await this.botService.findUserGiftPurchases(user.id);
        if (gifts.length === 0) {
            await ctx.reply(
                "Sizda hali olingan sovg'alar yo'q.",
                mainMenuKeyboard,
            );
            return;
        }

        const lines = gifts.map(
            (g: any, i) =>
                `${i + 1}. ${g.gift?.title ?? "[o'chirilgan sovg'a]"}`,
        );
        await ctx.reply(
            `🎁 Olingan sovg'alaringiz (${gifts.length}):\n\n${lines.join('\n')}`,
            mainMenuKeyboard,
        );
    }

    @Hears(MENU_REVIEW)
    async onReviewMenu(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start");
            return;
        }

        const { total } = await this.catalogService.findProductsPage(
            0,
            PAGE_SIZE,
        );
        if (total === 0) {
            await ctx.reply(
                'Hozircha mahsulotlar mavjud emas.',
                mainMenuKeyboard,
            );
            return;
        }

        await ctx.reply(
            `📦 Mahsulotlar (${total}):\nXaridni tasdiqlab bonus yutib oling 👇`,
            mainMenuKeyboard,
        );

        await this.sendProductPage(ctx, 0);
    }

    @Action(/^prodpage:(\d+)$/)
    async onProductPage(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const page = Number(ctx.match?.[1] ?? 0);
        await this.sendProductPage(ctx, page);
    }

    @Hears(MENU_GIFTS)
    async onGiftsMenu(@TelegrafCtx() ctx: BotCtx) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start");
            return;
        }

        const { total } = await this.catalogService.findGiftsPage(0, PAGE_SIZE);
        if (total === 0) {
            await ctx.reply(
                "Hozircha sovg'alar mavjud emas.",
                mainMenuKeyboard,
            );
            return;
        }

        await ctx.reply(
            `🎁 Sovg'alar (${total}):\n💰 Sizning bonusingiz: ${user.bonus}`,
            mainMenuKeyboard,
        );

        await this.sendGiftPage(ctx, 0);
    }

    @Action(/^giftpage:(\d+)$/)
    async onGiftPage(@TelegrafCtx() ctx: BotCtx) {
        await ctx.answerCbQuery().catch(() => undefined);
        const page = Number(ctx.match?.[1] ?? 0);
        await this.sendGiftPage(ctx, page);
    }

    private async sendProductPage(ctx: BotCtx, page: number) {
        const session = this.getSession(ctx);
        const {
            items,
            totalPages,
            page: safePage,
        } = await this.catalogService.findProductsPage(page, PAGE_SIZE);

        await this.deleteTracked(ctx, session.productMsgIds);

        const msgIds: number[] = [];
        for (const product of items) {
            const inline = Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '📦 Ushbu mahsulotni tanlash',
                        `review:${String(product.id)}`,
                    ),
                ],
            ]);
            const id = await this.sendItem(
                ctx,
                product.image,
                product.title,
                inline,
                String(product.id),
            );
            if (id) msgIds.push(id);
        }

        const navMsg = await ctx.reply(
            `📄 Sahifa ${safePage + 1}/${totalPages}`,
            this.buildNav('prodpage', safePage, totalPages),
        );
        msgIds.push(navMsg.message_id);

        session.productMsgIds = msgIds;
    }

    private async sendGiftPage(ctx: BotCtx, page: number) {
        const session = this.getSession(ctx);
        const {
            items,
            totalPages,
            page: safePage,
        } = await this.catalogService.findGiftsPage(page, PAGE_SIZE);

        await this.deleteTracked(ctx, session.giftMsgIds);

        const msgIds: number[] = [];
        for (const gift of items) {
            const caption = `🎁 ${gift.title}\n💸 Narxi: ${gift.price} bonus`;
            const inline = Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '🛒 Almashtirish',
                        `gift:${String(gift.id)}`,
                    ),
                ],
            ]);
            const id = await this.sendItem(
                ctx,
                gift.image,
                caption,
                inline,
                String(gift.id),
            );
            if (id) msgIds.push(id);
        }

        const navMsg = await ctx.reply(
            `📄 Sahifa ${safePage + 1}/${totalPages}`,
            this.buildNav('giftpage', safePage, totalPages),
        );
        msgIds.push(navMsg.message_id);

        session.giftMsgIds = msgIds;
    }

    private async sendOrdersPage(ctx: BotCtx, page: number, edit: boolean) {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        const user = await this.botService.findByTelegramId(telegramId);
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start");
            return;
        }

        const {
            items,
            total,
            totalPages,
            page: safePage,
        } = await this.botService.findUserOrdersPage(
            user.id,
            page,
            PAGE_SIZE,
        );

        if (total === 0) {
            await ctx.reply(
                "Sizda hali tasdiqlangan xaridlar yo'q.",
                mainMenuKeyboard,
            );
            return;
        }

        const lines = items.map(
            (p: any, i) =>
                `${safePage * PAGE_SIZE + i + 1}. ${p.product?.title ?? "[o'chirilgan mahsulot]"}`,
        );
        const text =
            `🛒 Xaridlaringiz (${total}):\n\n` +
            `${lines.join('\n')}\n\n` +
            `📄 Sahifa ${safePage + 1}/${totalPages}`;
        const nav = this.buildNav('orderpage', safePage, totalPages);

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
                const msg = await ctx.replyWithPhoto(image, {
                    caption,
                    ...inline,
                });
                return msg.message_id;
            }
            const msg = await ctx.reply(caption, inline);
            return msg.message_id;
        } catch (err) {
            this.logger.warn(
                `Element yuborilmadi (${itemId}): ${(err as Error).message}`,
            );
            try {
                const msg = await ctx.reply(caption, inline);
                return msg.message_id;
            } catch (fallbackErr) {
                this.logger.error(
                    `Fallback ham yuborilmadi (${itemId}): ${(fallbackErr as Error).message}`,
                );
                return undefined;
            }
        }
    }

    private buildNav(prefix: string, page: number, totalPages: number) {
        const row: ReturnType<typeof Markup.button.callback>[] = [];
        if (page > 0) {
            row.push(
                Markup.button.callback('⬅️ Orqaga', `${prefix}:${page - 1}`),
            );
        }
        if (page < totalPages - 1) {
            row.push(
                Markup.button.callback('Oldinga ➡️', `${prefix}:${page + 1}`),
            );
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
        if (!user) {
            await ctx.reply("Iltimos, avval ro'yxatdan o'ting. /start");
            return;
        }

        await ctx.scene.enter(REVIEW_SCENE, { productId });
    }

    @Action(/^gift:(\d+)$/)
    async onGiftBuy(@TelegrafCtx() ctx: BotCtx) {
        const giftId = Number(ctx.match?.[1]);
        if (!giftId) {
            await ctx.answerCbQuery().catch(() => undefined);
            return;
        }

        const telegramId = ctx.from?.id;
        if (!telegramId) {
            await ctx.answerCbQuery().catch(() => undefined);
            return;
        }

        const user = await this.botService.findByTelegramId(telegramId);
        if (!user) {
            await ctx
                .answerCbQuery("Avval ro'yxatdan o'ting.")
                .catch(() => undefined);
            return;
        }

        const gift = await this.catalogService.findGiftById(giftId);
        if (!gift) {
            await ctx.answerCbQuery("Sovg'a topilmadi.").catch(() => undefined);
            return;
        }

        if (user.bonus < gift.price) {
            await ctx
                .answerCbQuery(
                    `Bonusingiz yetarli emas (${user.bonus}/${gift.price}).`,
                    { show_alert: true },
                )
                .catch(() => undefined);
            return;
        }

        const updated = await this.botService.deductBonus(
            telegramId,
            gift.price,
        );
        if (!updated) {
            await ctx
                .answerCbQuery('Bonusingiz yetarli emas.', { show_alert: true })
                .catch(() => undefined);
            return;
        }

        await this.botService.createGiftPurchase({
            userId: updated.id,
            giftId: gift.id,
            price: gift.price,
        });

        await ctx
            .answerCbQuery("Sovg'a sotib olindi ✅")
            .catch(() => undefined);
        await ctx.reply(
            `✅ Tabriklaymiz! Siz "${gift.title}" sovg'asini almashtirib oldingiz.\n` +
                `💸 -${gift.price} bonus\n` +
                `💰 Qolgan bonus: ${updated.bonus}`,
            mainMenuKeyboard,
        );
    }
}
