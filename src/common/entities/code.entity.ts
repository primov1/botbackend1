import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Mahsulot kodi — admin panelda yaratiladi, stikerda chop etiladi.
 * Bot QR-2 (?start=KOD) orqali o'qib chek yuklashga o'tkazadi.
 */
@Entity('codes')
export class Code {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'varchar' })
    code: string;

    @Index()
    @Column({ type: 'int' })
    productId: number;

    @Column({ type: 'int', default: 0 })
    points: number;

    @Index()
    @Column({ type: 'boolean', default: false })
    isUsed: boolean;

    @Column({ type: 'int', nullable: true })
    usedByUserId: number | null;

    @Column({ type: 'timestamptz', nullable: true })
    usedAt: Date | null;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
