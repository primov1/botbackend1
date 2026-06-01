import { Injectable, Logger } from '@nestjs/common';

/**
 * Chek rasmini doimiy saqlash uchun ImgBB'ga yuklaydi.
 * Telegram fayl havolasi token'ni o'z ichiga oladi va token almashsa ishlamay
 * qoladi; ImgBB URL'i esa barqaror. IMGBB_API_KEY bo'lmasa null qaytaradi
 * (chaqiruvchi Telegram havolasiga qaytadi).
 */
@Injectable()
export class ImageUploadService {
    private readonly logger = new Logger(ImageUploadService.name);

    async uploadFromUrl(sourceUrl: string): Promise<string | null> {
        const apiKey = process.env.IMGBB_API_KEY;
        if (!apiKey) return null;

        try {
            const fileRes = await fetch(sourceUrl);
            if (!fileRes.ok) throw new Error(`yuklab olinmadi: ${fileRes.status}`);
            const base64 = Buffer.from(await fileRes.arrayBuffer()).toString('base64');

            const body = new URLSearchParams();
            body.append('key', apiKey);
            body.append('image', base64);

            const up = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body });
            const json = (await up.json()) as any;
            if (!json?.success) throw new Error('ImgBB rad etdi');

            return json.data.display_url as string;
        } catch (err) {
            this.logger.warn(`ImgBB yuklash muvaffaqiyatsiz: ${(err as Error).message}`);
            return null;
        }
    }
}
