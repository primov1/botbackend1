import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';
import { Gift } from './gift.entity';

@Entity('gift_purchases')
export class GiftPurchase {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'int' })
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Index()
    @Column({ type: 'int', nullable: true })
    giftId: number | null;

    @ManyToOne(() => Gift, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'giftId' })
    gift: Gift | null;

    @Column({ type: 'int', default: 0 })
    price: number;

    // Admin tasdig'i: pending / approved / rejected
    @Index()
    @Column({ type: 'varchar', default: 'pending' })
    status: 'pending' | 'approved' | 'rejected';

    // Admin sovg'ani yetkazib berdimi (tasdiqlangach)
    @Index()
    @Column({ type: 'boolean', default: false })
    delivered: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
