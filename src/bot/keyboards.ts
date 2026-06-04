import { Markup } from 'telegraf';
import type { ReplyKeyboardMarkup, InlineKeyboardMarkup } from 'telegraf/types';
import { Lang, LANGS, t } from './i18n';

// ===== Til tanlash (inline) =====
export const languageKeyboard: Markup.Markup<InlineKeyboardMarkup> = Markup.inlineKeyboard([
    [Markup.button.callback('🇺🇿 O‘zbekcha', 'setlang:uz')],
    [Markup.button.callback('🇷🇺 Русский', 'setlang:ru')],
    [Markup.button.callback('🇬🇧 English', 'setlang:en')],
]);

// ===== Asosiy menyu (tilga qarab) =====
export function mainMenuKeyboard(lang: Lang): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([
        [t(lang, 'menu_code')],
        [t(lang, 'menu_review'), t(lang, 'menu_gifts')],
    ]).resize();
}

export function reviewConfirmKeyboard(lang: Lang): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([[t(lang, 'btn_confirm')], [t(lang, 'btn_cancel')]])
        .resize()
        .oneTime();
}

export function cancelOnlyKeyboard(lang: Lang): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([[t(lang, 'btn_cancel')]]).resize();
}

// ===== @Hears / matn solishtirish uchun (BARCHA tillarda) =====
export const MENU_REVIEW_ALL = LANGS.map((l) => t(l, 'menu_review'));
export const MENU_GIFTS_ALL = LANGS.map((l) => t(l, 'menu_gifts'));
export const MENU_CODE_ALL = LANGS.map((l) => t(l, 'menu_code'));

const CONFIRM_ALL = LANGS.map((l) => t(l, 'btn_confirm'));
const CANCEL_ALL = LANGS.map((l) => t(l, 'btn_cancel'));

export const isReviewConfirm = (text: string): boolean => CONFIRM_ALL.includes(text);
export const isReviewCancel = (text: string): boolean => CANCEL_ALL.includes(text);
