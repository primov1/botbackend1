import { Injectable } from '@nestjs/common';
import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { BotService, CreateUserPayload } from '../bot.service';
import { RegionsService } from '../regions.service';
import { mainMenuKeyboard } from '../keyboards';

export const REGISTRATION_SCENE = 'REGISTRATION_SCENE';

interface RegistrationState {
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

@Injectable()
@Wizard(REGISTRATION_SCENE)
export class RegistrationScene {
    constructor(
        private readonly botService: BotService,
        private readonly regionsService: RegionsService,
    ) {}

    @WizardStep(1)
    async askPhone(@Ctx() ctx: WizardCtx) {
        await ctx.reply(
            "Assalomu alaykum! Ro'yxatdan o'tish uchun telefon raqamingizni yuboring 👇",
            Markup.keyboard([
                [Markup.button.contactRequest('📞 Telefon raqamni yuborish')],
            ])
                .oneTime()
                .resize(),
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    async handlePhone(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        let rawPhone: string | undefined;

        if (message?.contact?.phone_number) {
            rawPhone = message.contact.phone_number;
        } else if (typeof message?.text === 'string') {
            rawPhone = message.text;
        }

        const phone = rawPhone ? BotService.normalizePhone(rawPhone) : '';

        if (!phone || !BotService.isValidUzbekPhone(phone)) {
            await ctx.reply(
                "❌ Telefon raqam noto'g'ri!\n\n" +
                "Raqam +998 bilan boshlanib, 12 ta raqamdan iborat bo'lishi kerak.\n" +
                "Masalan: +998901234567\n\n" +
                "Iltimos, pastdagi tugma orqali yuboring 👇",
                Markup.keyboard([
                    [Markup.button.contactRequest('📞 Telefon raqamni yuborish')],
                ])
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
            await ctx.reply(
                `Xush kelibsiz, ${existing.firstName}! 👋\nSiz tizimga muvaffaqiyatli kirdingiz.\n💰 Bonus hisobingiz: ${existing.bonus}`,
                mainMenuKeyboard,
            );
            await ctx.scene.leave();
            return;
        }

        (ctx.wizard.state as RegistrationState).phone = phone;
        await ctx.reply('Ismingizni kiriting:', Markup.removeKeyboard());
        ctx.wizard.next();
    }

    @WizardStep(3)
    async handleFirstName(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (!text) {
            await ctx.reply("Iltimos, ismingizni matn ko'rinishida kiriting:");
            return;
        }

        (ctx.wizard.state as RegistrationState).firstName = text;
        await ctx.reply('Familiyangizni kiriting:');
        ctx.wizard.next();
    }

    @WizardStep(4)
    async handleLastName(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (!text) {
            await ctx.reply("Iltimos, familiyangizni matn ko'rinishida kiriting:");
            return;
        }

        (ctx.wizard.state as RegistrationState).lastName = text;

        const regions = this.regionsService.getRegionNames();
        if (regions.length === 0) {
            await ctx.reply("Hozircha viloyatlar ro'yxati mavjud emas. Keyinroq urinib ko'ring.");
            await ctx.scene.leave();
            return;
        }

        await ctx.reply(
            'Viloyatni tanlang:',
            Markup.keyboard(chunk(regions, 2)).oneTime().resize(),
        );
        ctx.wizard.next();
    }

    @WizardStep(5)
    async handleRegion(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';

        if (!text || !this.regionsService.hasRegion(text)) {
            const regions = this.regionsService.getRegionNames();
            await ctx.reply(
                "Iltimos, ro'yxatdan viloyatni tanlang:",
                Markup.keyboard(chunk(regions, 2)).oneTime().resize(),
            );
            return;
        }

        (ctx.wizard.state as RegistrationState).region = text;

        const districts = this.regionsService.getDistricts(text);
        await ctx.reply(
            'Tumanni tanlang:',
            Markup.keyboard(chunk(districts, 2)).oneTime().resize(),
        );
        ctx.wizard.next();
    }

    @WizardStep(6)
    async handleDistrict(@Ctx() ctx: WizardCtx) {
        const message: any = (ctx as any).message;
        const text = typeof message?.text === 'string' ? message.text.trim() : '';
        const state = ctx.wizard.state as RegistrationState;
        const telegramId = ctx.from?.id;

        if (!state.region || !this.regionsService.hasDistrict(state.region, text)) {
            const districts = state.region ? this.regionsService.getDistricts(state.region) : [];
            await ctx.reply(
                "Iltimos, ro'yxatdan tumanni tanlang:",
                Markup.keyboard(chunk(districts, 2)).oneTime().resize(),
            );
            return;
        }

        if (!state.phone || !state.firstName || !state.lastName || !telegramId) {
            await ctx.reply(
                "Xatolik yuz berdi. /start buyrug'i bilan qaytadan urinib ko'ring.",
                Markup.removeKeyboard(),
            );
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
        };

        const user = await this.botService.createUser(payload);

        await ctx.reply(
            `✅ Tabriklaymiz, ${user.firstName} ${user.lastName}!\n` +
            `Siz muvaffaqiyatli ro'yxatdan o'tdingiz.\n` +
            `📍 Manzil: ${user.region}, ${user.district}\n` +
            `💰 Bonus hisobingiz: ${user.bonus}`,
            mainMenuKeyboard,
        );
        await ctx.scene.leave();
    }
}
