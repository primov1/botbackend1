import { Injectable } from '@nestjs/common';
import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { BotService } from '../bot.service';
import { cancelOnlyKeyboard, mainMenuKeyboard, isReviewCancel } from '../keyboards';
import { Lang, normalizeLang, t } from '../i18n';

export const CODE_SCENE = 'CODE_SCENE';

interface CodeState {
    lang?: Lang;
}

type WizardCtx = Scenes.WizardContext;

/**
 * Avtomatik kod tasdiqlash: foydalanuvchi kodni yozadi, bot tekshiradi.
 * Mos kelsa — bonus darhol qo'shiladi (kodning ballidan). Bo'lmasa — rad.
 */
@Injectable()
@Wizard(CODE_SCENE)
export class CodeScene {
    constructor(private readonly botService: BotService) {}

    @WizardStep(1)
    async ask(@Ctx() ctx: WizardCtx) {
        const user = await this.botService.findByTelegramId(ctx.from?.id ?? 0);
        const lang = normalizeLang(user?.language);
        (ctx.wizard.state as CodeState).lang = lang;

        if (!user) {
            await ctx.reply(t(lang, 'register_first'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        await ctx.reply(t(lang, 'code_enter_prompt'), cancelOnlyKeyboard(lang));
        ctx.wizard.next();
    }

    @WizardStep(2)
    async handle(@Ctx() ctx: WizardCtx) {
        const lang = (ctx.wizard.state as CodeState).lang ?? 'uz';
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (!text || isReviewCancel(text)) {
            await ctx.reply(t(lang, 'canceled'), mainMenuKeyboard(lang));
            await ctx.scene.leave();
            return;
        }

        const telegramId = ctx.from?.id;
        if (!telegramId) {
            await ctx.scene.leave();
            return;
        }

        await CodeScene.replyResult(ctx, lang, await this.botService.redeemCode(telegramId, text));
        await ctx.scene.leave();
    }

    /** Natijani mos xabar bilan javob beradi (boshqa joylardan ham ishlatiladi). */
    static async replyResult(ctx: any, lang: Lang, result: Awaited<ReturnType<BotService['redeemCode']>>) {
        if (!result.ok) {
            const key = result.reason === 'not_registered' ? 'register_first' : 'code_invalid';
            await ctx.reply(t(lang, key), mainMenuKeyboard(lang));
            return;
        }
        const msg = result.points > 0
            ? t(lang, 'code_redeemed', {
                  title: result.productTitle || '-',
                  points: result.points,
                  bonus: result.newBonus,
              })
            : t(lang, 'code_redeemed_nobonus');
        await ctx.reply(msg, mainMenuKeyboard(lang));
    }
}
