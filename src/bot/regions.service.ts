import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface RegionEntry {
    region: string;
    districts: string[];
}

@Injectable()
export class RegionsService implements OnModuleInit {
    private readonly logger = new Logger(RegionsService.name);
    private regions: RegionEntry[] = [];

    async onModuleInit() {
        const filePath = join(process.cwd(), 'public', 'regions.json');
        try {
            const raw = await readFile(filePath, 'utf-8');
            this.regions = JSON.parse(raw) as RegionEntry[];
        } catch (err) {
            this.logger.error(
                `regions.json o'qib bo'lmadi: ${(err as Error).message}`,
            );
            this.regions = [];
        }
    }

    getRegionNames(): string[] {
        return this.regions.map((r) => r.region);
    }

    getDistricts(region: string): string[] {
        return this.regions.find((r) => r.region === region)?.districts ?? [];
    }

    hasRegion(region: string): boolean {
        return this.regions.some((r) => r.region === region);
    }

    hasDistrict(region: string, district: string): boolean {
        return this.getDistricts(region).includes(district);
    }
}
