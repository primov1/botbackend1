// Bot matnlarini 3 tilda saqlaydigan i18n moduli (uz / ru / en).

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: Lang[] = ['uz', 'ru', 'en'];

/** Til kodini normalizatsiya qiladi (noma'lum bo'lsa uz). */
export function normalizeLang(code?: string | null): Lang {
    const c = (code ?? '').toLowerCase();
    if (c.startsWith('ru')) return 'ru';
    if (c.startsWith('en')) return 'en';
    return 'uz';
}

type Key =
    | 'choose_language' | 'language_set'
    | 'welcome_back' | 'register_first' | 'balance' | 'error_occurred'
    | 'no_gifts' | 'my_gifts_header' | 'deleted_gift'
    | 'no_products' | 'products_header'
    | 'no_gifts_available' | 'gifts_header'
    | 'btn_select_product' | 'page' | 'gift_caption' | 'btn_exchange'
    | 'no_orders' | 'orders_header' | 'deleted_product'
    | 'btn_back' | 'btn_next'
    | 'gift_not_found' | 'not_enough_bonus' | 'gift_success' | 'gift_requested' | 'code_invalid'
    | 'menu_code' | 'code_enter_prompt' | 'code_redeemed' | 'code_redeemed_nobonus'
    | 'menu_review' | 'menu_gifts' | 'btn_confirm' | 'btn_cancel'
    | 'ask_phone' | 'btn_send_phone' | 'invalid_phone' | 'welcome_existing'
    | 'ask_first_name' | 'invalid_first_name'
    | 'ask_last_name' | 'invalid_last_name'
    | 'no_regions' | 'ask_region' | 'invalid_region'
    | 'ask_district' | 'invalid_district'
    | 'register_error' | 'register_success' | 'register_canceled'
    | 'product_not_selected' | 'product_not_found'
    | 'btn_uzum' | 'btn_telegram' | 'btn_instagram'
    | 'product_info' | 'channel_warning' | 'product_info_plain'
    | 'press_confirm' | 'canceled' | 'please_press_button'
    | 'send_proof' | 'please_send_photo' | 'already_pending'
    | 'review_accepted' | 'channel_note'
    | 'ask_quantity' | 'invalid_quantity';

const messages: Record<Lang, Record<Key, string>> = {
    // ============================ O'ZBEK ============================
    uz: {
        choose_language: '🌐 Tilni tanlang / Выберите язык / Choose your language:',
        language_set: 'Til tanlandi: 🇺🇿 O‘zbekcha',
        welcome_back: 'Xush kelibsiz, {name}! 👋\n💰 Bonus hisobingiz: {bonus}',
        register_first: "Iltimos, avval ro'yxatdan o'ting. /start",
        balance: '💰 Bonus hisobingiz: {bonus} ball',
        error_occurred: 'Xatolik yuz berdi.',
        no_gifts: "Sizda hali olingan sovg'alar yo'q.",
        my_gifts_header: "🎁 Olingan sovg'alaringiz ({count}):\n\n{list}",
        deleted_gift: "[o'chirilgan sovg'a]",
        no_products: 'Hozircha mahsulotlar mavjud emas.',
        products_header: '📦 Mahsulotlar ({total}):\nXaridni tasdiqlab bonus yutib oling 👇',
        no_gifts_available: "Hozircha sovg'alar mavjud emas.",
        gifts_header: "🎁 Sovg'alar ({total}):\n💰 Sizning bonusingiz: {bonus}",
        btn_select_product: '📦 Ushbu mahsulotni tanlash',
        page: '📄 Sahifa {page}/{total}',
        gift_caption: '🎁 {title}\n💸 Narxi: {price} bonus',
        btn_exchange: '🛒 Almashtirish',
        no_orders: "Sizda hali tasdiqlangan xaridlar yo'q.",
        orders_header: '🛒 Xaridlaringiz ({total}):',
        deleted_product: "[o'chirilgan mahsulot]",
        btn_back: '⬅️ Orqaga',
        btn_next: 'Oldinga ➡️',
        gift_not_found: "Sovg'a topilmadi.",
        not_enough_bonus: '❌ Bonusingiz yetarli emas ({have}/{need}).',
        gift_success:
            '✅ Tabriklaymiz! Siz "{title}" sovg\'asini almashtirib oldingiz.\n💸 -{price} bonus\n💰 Qolgan bonus: {bonus}',
        gift_requested:
            '📩 So\'rovingiz qabul qilindi!\n🎁 "{title}" sovg\'asi uchun {price} bonus ushlab turildi.\n⏳ Admin tasdiqlagach sovg\'a beriladi (rad etilsa bonus qaytariladi).\n💰 Qolgan bonus: {bonus}',
        code_invalid: "❌ Kod yaroqsiz, allaqachon ishlatilgan yoki muddati o'tgan.",
        menu_code: '🎫 Kod kiritish',
        code_enter_prompt: "🎫 Mahsulotdagi kodni kiriting (masalan: AXZ78RT):",
        code_redeemed:
            "✅ Kod tasdiqlandi!\n🎁 \"{title}\" uchun +{points} bonus qo'shildi.\n💰 Joriy bonus: {bonus}",
        code_redeemed_nobonus: '✅ Kod tasdiqlandi! Rahmat.',
        menu_review: '🧾 Xaridni tasdiqlash',
        menu_gifts: "🎁 Sovg'alar",
        btn_confirm: '✅ Tasdiqlash',
        btn_cancel: '❌ Bekor qilish',
        ask_phone: "Assalomu alaykum! Ro'yxatdan o'tish uchun telefon raqamingizni yuboring 👇",
        btn_send_phone: '📞 Telefon raqamni yuborish',
        invalid_phone:
            "❌ Telefon raqam noto'g'ri!\n\nRaqam +998 bilan boshlanib, 12 ta raqamdan iborat bo'lishi kerak.\nMasalan: +998901234567\n\nIltimos, pastdagi tugma orqali yuboring 👇",
        welcome_existing:
            'Xush kelibsiz, {name}! 👋\nSiz tizimga muvaffaqiyatli kirdingiz.\n💰 Bonus hisobingiz: {bonus}',
        ask_first_name: 'Ismingizni kiriting:',
        invalid_first_name: "Iltimos, ismingizni matn ko'rinishida kiriting:",
        ask_last_name: 'Familiyangizni kiriting:',
        invalid_last_name: "Iltimos, familiyangizni matn ko'rinishida kiriting:",
        no_regions: "Hozircha viloyatlar ro'yxati mavjud emas. Keyinroq urinib ko'ring.",
        ask_region: 'Viloyatni tanlang:',
        invalid_region: "Iltimos, ro'yxatdan viloyatni tanlang:",
        ask_district: 'Tumanni tanlang:',
        invalid_district: "Iltimos, ro'yxatdan tumanni tanlang:",
        register_error: "Xatolik yuz berdi. /start buyrug'i bilan qaytadan urinib ko'ring.",
        register_success:
            "✅ Tabriklaymiz, {first} {last}!\nSiz muvaffaqiyatli ro'yxatdan o'tdingiz.\n📍 Manzil: {region}, {district}\n💰 Bonus hisobingiz: {bonus}",
        register_canceled: "Ro'yxatdan o'tish bekor qilindi. Qaytadan boshlash uchun /start bosing.",
        product_not_selected: 'Mahsulot tanlanmadi.',
        product_not_found: 'Mahsulot topilmadi.',
        btn_uzum: "🍇 Uzum Marketga o'tish",
        btn_telegram: "📢 Telegram kanalga obuna bo'lish",
        btn_instagram: "📸 Instagram sahifaga o'tish",
        product_info:
            '📦 <b>{title}</b>\n\n🎁 Xarid uchun bonus: <b>+{bonus}</b>\n\n{channelWarn}Mahsulotni sotib olgach chek rasmini yuboring 👇',
        channel_warning: "⚠️ <b>Diqqat!</b> Bonus olish uchun quyidagi kanal/sahifaga obuna bo'ling:\n",
        product_info_plain:
            '📦 {title}\n\n🎁 Xarid uchun bonus: +{bonus}\n\nMahsulotni sotib olgach chek rasmini yuboring 👇',
        press_confirm: "Ushbu mahsulotni sotib olgan bo'lsangiz Tasdiqlash tugmasini bosing. 👇",
        canceled: 'Bekor qilindi.',
        please_press_button: 'Iltimos, pastdagi tugmani bosing.',
        ask_quantity: "🔢 Nechta dona sotib oldingiz? Sonni yozing (masalan: 1, 2, 3):",
        invalid_quantity: "❌ Noto'g'ri son. 1 dan 100 gacha butun son yozing:",
        send_proof: 'Bonus hisoblash uchun chek rasmini yuboring 📸',
        please_send_photo: 'Iltimos, chek RASMINI yuboring (matn yoki fayl emas).',
        already_pending:
            '⏳ Bu mahsulot uchun tekshiruv allaqachon yuborilgan. Admin tasdiqlashini kuting.',
        review_accepted:
            "✅ Tekshirish uchun qabul qilindi!\n⏳ Tasdiqlangach hisobingizga qo'shiladi.\n🎁 Xarid uchun bonus: +{bonus}{channelNote}",
        channel_note:
            "\n⚠️ Eslatma: Kanalga obuna bo'lmagan bo'lsangiz bonus tasdiqlanmasligi mumkin.",
    },

    // ============================ РУССКИЙ ============================
    ru: {
        choose_language: '🌐 Tilni tanlang / Выберите язык / Choose your language:',
        language_set: 'Язык выбран: 🇷🇺 Русский',
        welcome_back: 'Добро пожаловать, {name}! 👋\n💰 Ваш бонусный счёт: {bonus}',
        register_first: 'Пожалуйста, сначала зарегистрируйтесь. /start',
        balance: '💰 Ваш бонусный счёт: {bonus} баллов',
        error_occurred: 'Произошла ошибка.',
        no_gifts: 'У вас пока нет полученных подарков.',
        my_gifts_header: '🎁 Ваши подарки ({count}):\n\n{list}',
        deleted_gift: '[удалённый подарок]',
        no_products: 'Пока нет доступных товаров.',
        products_header: '📦 Товары ({total}):\nПодтвердите покупку и получите бонусы 👇',
        no_gifts_available: 'Пока нет доступных подарков.',
        gifts_header: '🎁 Подарки ({total}):\n💰 Ваши бонусы: {bonus}',
        btn_select_product: '📦 Выбрать этот товар',
        page: '📄 Страница {page}/{total}',
        gift_caption: '🎁 {title}\n💸 Цена: {price} бонусов',
        btn_exchange: '🛒 Обменять',
        no_orders: 'У вас пока нет подтверждённых покупок.',
        orders_header: '🛒 Ваши покупки ({total}):',
        deleted_product: '[удалённый товар]',
        btn_back: '⬅️ Назад',
        btn_next: 'Вперёд ➡️',
        gift_not_found: 'Подарок не найден.',
        not_enough_bonus: '❌ Недостаточно бонусов ({have}/{need}).',
        gift_success:
            '✅ Поздравляем! Вы обменяли подарок "{title}".\n💸 -{price} бонусов\n💰 Остаток бонусов: {bonus}',
        gift_requested:
            '📩 Ваш запрос принят!\n🎁 За подарок "{title}" зарезервировано {price} бонусов.\n⏳ Подарок будет выдан после подтверждения админом (при отказе бонусы вернутся).\n💰 Остаток бонусов: {bonus}',
        code_invalid: '❌ Код недействителен, уже использован или истёк срок.',
        menu_code: '🎫 Ввести код',
        code_enter_prompt: '🎫 Введите код с товара (например: AXZ78RT):',
        code_redeemed:
            '✅ Код подтверждён!\n🎁 За "{title}" начислено +{points} бонусов.\n💰 Текущий баланс: {bonus}',
        code_redeemed_nobonus: '✅ Код подтверждён! Спасибо.',
        menu_review: '🧾 Подтвердить покупку',
        menu_gifts: '🎁 Подарки',
        btn_confirm: '✅ Подтвердить',
        btn_cancel: '❌ Отмена',
        ask_phone: 'Здравствуйте! Для регистрации отправьте свой номер телефона 👇',
        btn_send_phone: '📞 Отправить номер телефона',
        invalid_phone:
            '❌ Неверный номер телефона!\n\nНомер должен начинаться с +998 и состоять из 12 цифр.\nНапример: +998901234567\n\nПожалуйста, отправьте через кнопку ниже 👇',
        welcome_existing:
            'Добро пожаловать, {name}! 👋\nВы успешно вошли в систему.\n💰 Ваш бонусный счёт: {bonus}',
        ask_first_name: 'Введите ваше имя:',
        invalid_first_name: 'Пожалуйста, введите имя текстом:',
        ask_last_name: 'Введите вашу фамилию:',
        invalid_last_name: 'Пожалуйста, введите фамилию текстом:',
        no_regions: 'Список регионов пока недоступен. Попробуйте позже.',
        ask_region: 'Выберите регион:',
        invalid_region: 'Пожалуйста, выберите регион из списка:',
        ask_district: 'Выберите район:',
        invalid_district: 'Пожалуйста, выберите район из списка:',
        register_error: 'Произошла ошибка. Попробуйте снова с помощью команды /start.',
        register_success:
            '✅ Поздравляем, {first} {last}!\nВы успешно зарегистрировались.\n📍 Адрес: {region}, {district}\n💰 Ваш бонусный счёт: {bonus}',
        register_canceled: 'Регистрация отменена. Нажмите /start, чтобы начать заново.',
        product_not_selected: 'Товар не выбран.',
        product_not_found: 'Товар не найден.',
        btn_uzum: '🍇 Перейти в Uzum Market',
        btn_telegram: '📢 Подписаться на Telegram-канал',
        btn_instagram: '📸 Перейти в Instagram',
        product_info:
            '📦 <b>{title}</b>\n\n🎁 Бонус за покупку: <b>+{bonus}</b>\n\n{channelWarn}После покупки отправьте фото чека 👇',
        channel_warning:
            '⚠️ <b>Внимание!</b> Чтобы получить бонус, подпишитесь на канал/страницу ниже:\n',
        product_info_plain:
            '📦 {title}\n\n🎁 Бонус за покупку: +{bonus}\n\nПосле покупки отправьте фото чека 👇',
        press_confirm: 'Если вы купили этот товар, нажмите кнопку Подтвердить. 👇',
        canceled: 'Отменено.',
        please_press_button: 'Пожалуйста, нажмите кнопку ниже.',
        ask_quantity: '🔢 Сколько штук вы купили? Введите число (например: 1, 2, 3):',
        invalid_quantity: '❌ Неверное число. Введите целое число от 1 до 100:',
        send_proof: 'Для начисления бонуса отправьте фото чека 📸',
        please_send_photo: 'Пожалуйста, отправьте именно ФОТО чека (не текст и не файл).',
        already_pending: '⏳ Заявка по этому товару уже отправлена. Ожидайте подтверждения админа.',
        review_accepted:
            '✅ Принято на проверку!\n⏳ После подтверждения бонус начислится на ваш счёт.\n🎁 Бонус за покупку: +{bonus}{channelNote}',
        channel_note:
            '\n⚠️ Примечание: если вы не подписаны на канал, бонус может быть не подтверждён.',
    },

    // ============================ ENGLISH ============================
    en: {
        choose_language: '🌐 Tilni tanlang / Выберите язык / Choose your language:',
        language_set: 'Language set: 🇬🇧 English',
        welcome_back: 'Welcome back, {name}! 👋\n💰 Your bonus balance: {bonus}',
        register_first: 'Please register first. /start',
        balance: '💰 Your bonus balance: {bonus} points',
        error_occurred: 'An error occurred.',
        no_gifts: "You don't have any received gifts yet.",
        my_gifts_header: '🎁 Your gifts ({count}):\n\n{list}',
        deleted_gift: '[deleted gift]',
        no_products: 'No products available yet.',
        products_header: '📦 Products ({total}):\nConfirm your purchase and earn bonuses 👇',
        no_gifts_available: 'No gifts available yet.',
        gifts_header: '🎁 Gifts ({total}):\n💰 Your bonus: {bonus}',
        btn_select_product: '📦 Select this product',
        page: '📄 Page {page}/{total}',
        gift_caption: '🎁 {title}\n💸 Price: {price} bonus',
        btn_exchange: '🛒 Exchange',
        no_orders: "You don't have any confirmed purchases yet.",
        orders_header: '🛒 Your purchases ({total}):',
        deleted_product: '[deleted product]',
        btn_back: '⬅️ Back',
        btn_next: 'Next ➡️',
        gift_not_found: 'Gift not found.',
        not_enough_bonus: '❌ Not enough bonus ({have}/{need}).',
        gift_success:
            '✅ Congratulations! You exchanged the gift "{title}".\n💸 -{price} bonus\n💰 Remaining bonus: {bonus}',
        gift_requested:
            '📩 Your request has been received!\n🎁 {price} bonus reserved for the gift "{title}".\n⏳ The gift will be issued after admin approval (bonus refunded if rejected).\n💰 Remaining bonus: {bonus}',
        code_invalid: '❌ Code is invalid, already used, or expired.',
        menu_code: '🎫 Enter code',
        code_enter_prompt: '🎫 Enter the code from the product (e.g. AXZ78RT):',
        code_redeemed:
            '✅ Code confirmed!\n🎁 +{points} bonus added for "{title}".\n💰 Current balance: {bonus}',
        code_redeemed_nobonus: '✅ Code confirmed! Thank you.',
        menu_review: '🧾 Confirm purchase',
        menu_gifts: '🎁 Gifts',
        btn_confirm: '✅ Confirm',
        btn_cancel: '❌ Cancel',
        ask_phone: 'Hello! To register, please send your phone number 👇',
        btn_send_phone: '📞 Send phone number',
        invalid_phone:
            '❌ Invalid phone number!\n\nThe number must start with +998 and contain 12 digits.\nExample: +998901234567\n\nPlease send it using the button below 👇',
        welcome_existing:
            'Welcome back, {name}! 👋\nYou have successfully logged in.\n💰 Your bonus balance: {bonus}',
        ask_first_name: 'Enter your first name:',
        invalid_first_name: 'Please enter your first name as text:',
        ask_last_name: 'Enter your last name:',
        invalid_last_name: 'Please enter your last name as text:',
        no_regions: 'The list of regions is not available yet. Please try again later.',
        ask_region: 'Choose your region:',
        invalid_region: 'Please choose a region from the list:',
        ask_district: 'Choose your district:',
        invalid_district: 'Please choose a district from the list:',
        register_error: 'An error occurred. Please try again with the /start command.',
        register_success:
            '✅ Congratulations, {first} {last}!\nYou have successfully registered.\n📍 Address: {region}, {district}\n💰 Your bonus balance: {bonus}',
        register_canceled: 'Registration cancelled. Press /start to begin again.',
        product_not_selected: 'No product selected.',
        product_not_found: 'Product not found.',
        btn_uzum: '🍇 Go to Uzum Market',
        btn_telegram: '📢 Subscribe to Telegram channel',
        btn_instagram: '📸 Go to Instagram',
        product_info:
            '📦 <b>{title}</b>\n\n🎁 Bonus for purchase: <b>+{bonus}</b>\n\n{channelWarn}After buying, send a photo of the receipt 👇',
        channel_warning:
            '⚠️ <b>Attention!</b> To receive the bonus, subscribe to the channel/page below:\n',
        product_info_plain:
            '📦 {title}\n\n🎁 Bonus for purchase: +{bonus}\n\nAfter buying, send a photo of the receipt 👇',
        press_confirm: 'If you bought this product, press the Confirm button. 👇',
        canceled: 'Cancelled.',
        please_press_button: 'Please press the button below.',
        ask_quantity: '🔢 How many units did you buy? Enter a number (e.g. 1, 2, 3):',
        invalid_quantity: '❌ Invalid number. Enter a whole number from 1 to 100:',
        send_proof: 'To calculate the bonus, send a photo of the receipt 📸',
        please_send_photo: 'Please send a PHOTO of the receipt (not text or a file).',
        already_pending: '⏳ A review for this product has already been submitted. Wait for admin approval.',
        review_accepted:
            '✅ Accepted for review!\n⏳ Once approved, it will be added to your balance.\n🎁 Bonus for purchase: +{bonus}{channelNote}',
        channel_note: '\n⚠️ Note: if you are not subscribed to the channel, the bonus may not be approved.',
    },
};

/** Tarjima + {param} o'rnini almashtirish. */
export function t(lang: Lang, key: Key, params: Record<string, string | number> = {}): string {
    let text = messages[lang]?.[key] ?? messages.uz[key] ?? key;
    for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
    }
    return text;
}
