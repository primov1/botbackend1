import { Injectable } from '@nestjs/common';
import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService, CreateUserPayload } from '../bot.service';
import { RegionsService } from '../regions.service';
import { mainMenuKeyboard } from '../keyboards';
import { Lang, normalizeLang, t } from '../i18n';
import { CodeScene } from './code.scene';

export const REGISTRATION_SCENE = 'REGISTRATION_SCENE';

interface RegistrationState {
    lang?: Lang;
    phone?: string;
    firstName?: string;
    lastName?: string;
    region?: string;
}

type WizardCtx = Scenes.WizardContext;

const chunk = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const CANCEL_COMMANDS = ['/bekor', '/cancel', '/start'];

@Injectable()
@Wizard(REGISTRATION_SCENE)
export class RegistrationScene {
    constructor(
        private readonly botService: BotService,
        private readonly regionsService: RegionsService,
    ) {}

    private lang(ctx: WizardCtx): Lang {
        return (ctx.wizard.state as RegistrationState).lang ?? 'uz';
    }

    /** /bekor, /cancel yoki /start yozsa, ro'yxatdan o'tishni bekor qiladi. */
    private async maybeAbort(ctx: WizardCtx, text: string): Promise<boolean> {
        if (!CANCEL_COMMANDS.includes(text.toLowerCase())) return false;
        await ctx.reply(t(this.lang(ctx), 'register_canceled'), Markup.removeKeyboard());
        await ctx.scene.leave();
        return true;
    }

    @WizardStep(1)
    async askPhone(@Ctx() ctx: WizardCtx) {
        // Til scene state'dan olinadi va wizard state'ga saqlanadi
        const lang = normalizeLang((ctx.scene.state as RegistrationState)?.lang);
        (ctx.wizard.state as RegistrationState).lang = lang;

        await ctx.reply(
            t(lang, 'ask_phone'),
            Markup.keyboard([[Markup.button.contactRequest(t(lang, 'btn_send_phone'))]])
                .oneTime()
                .resize(),
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    async handlePhone(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        let rawPhone: string | undefined;

        if (message?.contact?.phone_number) {
            rawPhone = message.contact.phone_number;
        } else if (typeof message?.text === 'string') {
            rawPhone = message.text;
        }

        if (typeof message?.text === 'string' && (await this.maybeAbort(ctx, message.text.trim()))) {
            return;
        }

        const phone = rawPhone ? BotService.normalizePhone(rawPhone) : '';

        if (!phone || !BotService.isValidUzbekPhone(phone)) {
            await ctx.reply(
                t(lang, 'invalid_phone'),
                Markup.keyboard([[Markup.button.contactRequest(t(lang, 'btn_send_phone'))]])
                    .oneTime()
                    .resize(),
            );
            return;
        }

        const existing = await this.botService.findByPhone(phone);
        if (existing) {
            const telegramId = ctx.from?.id;
            if (telegramId && existing.telegramId !== telegramId) {
                await this.botService.updateTelegramId(phone, telegramId);
            }
            if (telegramId) await this.botService.updateLanguage(telegramId, lang);
            await ctx.reply(
                t(lang, 'welcome_existing', { name: existing.firstName, bonus: existing.bonus }),
                mainMenuKeyboard(lang),
            );
            await ctx.scene.leave();
            return;
        }

        (ctx.wizard.state as RegistrationState).phone = phone;
        await ctx.reply(t(lang, 'ask_first_name'), Markup.removeKeyboard());
        ctx.wizard.next();
    }

    @WizardStep(3)
    async handleFirstName(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (await this.maybeAbort(ctx, text)) return;

        if (!text) {
            await ctx.reply(t(lang, 'invalid_first_name'));
            return;
        }

        (ctx.wizard.state as RegistrationState).firstName = text;
        await ctx.reply(t(lang, 'ask_last_name'));
        ctx.wizard.next();
    }

    @WizardStep(4)
    async handleLastName(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (await this.maybeAbort(ctx, text)) return;

        if (!text) {
            await ctx.reply(t(lang, 'invalid_last_name'));
            return;
        }

        (ctx.wizard.state as RegistrationState).lastName = text;

        const regions = this.regionsService.getRegionNames();
        if (regions.length === 0) {
            await ctx.reply(t(lang, 'no_regions'));
            await ctx.scene.leave();
            return;
        }

        await ctx.reply(t(lang, 'ask_region'), Markup.keyboard(chunk(regions, 2)).oneTime().resize());
        ctx.wizard.next();
    }

    @WizardStep(5)
    async handleRegion(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (await this.maybeAbort(ctx, text)) return;

        if (!text || !this.regionsService.hasRegion(text)) {
            const regions = this.regionsService.getRegionNames();
            await ctx.reply(t(lang, 'invalid_region'), Markup.keyboard(chunk(regions, 2)).oneTime().resize());
            return;
        }

        (ctx.wizard.state as RegistrationState).region = text;

        const districts = this.regionsService.getDistricts(text);
        await ctx.reply(t(lang, 'ask_district'), Markup.keyboard(chunk(districts, 2)).oneTime().resize());
        ctx.wizard.next();
    }

    @WizardStep(6)
    async handleDistrict(@Ctx() ctx: WizardCtx) {
        const lang = this.lang(ctx);
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';
        const state = ctx.wizard.state as RegistrationState;
        const telegramId = ctx.from?.id;

        if (await this.maybeAbort(ctx, text)) return;

        if (!state.region || !this.regionsService.hasDistrict(state.region, text)) {
            const districts = state.region ? this.regionsService.getDistricts(state.region) : [];
            await ctx.reply(t(lang, 'invalid_district'), Markup.keyboard(chunk(districts, 2)).oneTime().resize());
            return;
        }

        if (!state.phone || !state.firstName || !state.lastName || !telegramId) {
            await ctx.reply(t(lang, 'register_error'), Markup.removeKeyboard());
            await ctx.scene.leave();
            return;
        }

        const payload: CreateUserPayload = {
            telegramId,
            phone: state.phone,
            firstName: state.firstName,
            lastName: state.lastName,
            region: state.region,
            district: text,
            username: ctx.from?.username ?? '',
            language: lang,
        };

        const user = await this.botService.createUser(payload);

        await ctx.reply(
            t(lang, 'register_success', {
                first: user.firstName,
                last: user.lastName,
                region: user.region,
                district: user.district,
                bonus: user.bonus,
            }),
            mainMenuKeyboard(lang),
        );

        // QR-2 orqali kelgan bo'lsa — ro'yxatdan keyin to'g'ridan chek yuklashga
        const pendingCode = (ctx.session as any)?.pendingCode;
        await ctx.scene.leave();
        if (pendingCode && telegramId) {
            delete (ctx.session as any).pendingCode;
            const result = await this.botService.redeemCode(telegramId, String(pendingCode));
            await CodeScene.replyResult(ctx, lang, result);
        }
    }
}
