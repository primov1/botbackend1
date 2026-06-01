import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({
        type: 'bigint',
        nullable: true,
        unique: true,
        transformer: {
            to: (v: number | null) => v,
            from: (v: string | number | null) => (v == null ? null : Number(v)),
        },
    })
    telegramId: number;

    // null'ga ruxsat: unique constraint null'larni alohida deb hisoblaydi,
    // shuning uchun telefonsiz yozuvlar to'qnashmaydi (default '' muammosi yo'q).
    @Index()
    @Column({ type: 'varchar', nullable: true, unique: true })
    phone: string | null;

    @Column({ type: 'varchar', default: '' })
    firstName: string;

    @Column({ type: 'varchar', default: '' })
    lastName: string;

    @Column({ type: 'varchar', default: '' })
    region: string;

    @Column({ type: 'varchar', default: '' })
    district: string;

    @Column({ type: 'varchar', default: '' })
    username: string;

    @Column({ type: 'varchar', default: 'uz' })
    language: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    bonus: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
