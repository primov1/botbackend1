import { Markup } from 'telegraf';
import type { ReplyKeyboardMarkup } from 'telegraf/types';

export const MENU_REVIEW = '🧾 Xaridni tasdiqlash';
export const MENU_GIFTS = "🎁 Sovg'alar";

export const REVIEW_CONFIRM = '✅ Tasdiqlash';
export const REVIEW_CANCEL = '❌ Bekor qilish';

export const mainMenuKeyboard: Markup.Markup<ReplyKeyboardMarkup> =
    Markup.keyboard([[MENU_REVIEW, MENU_GIFTS]]).resize();

export const reviewConfirmKeyboard: Markup.Markup<ReplyKeyboardMarkup> =
    Markup.keyboard([[REVIEW_CONFIRM], [REVIEW_CANCEL]])
        .resize()
        .oneTime();

export const cancelOnlyKeyboard: Markup.Markup<ReplyKeyboardMarkup> =
    Markup.keyboard([[REVIEW_CANCEL]]).resize();
