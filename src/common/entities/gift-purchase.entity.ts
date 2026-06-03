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

    // Admin sovg'ani yetkazib berdimi (fulfillment tracking)
    @Index()
    @Column({ type: 'boolean', default: false })
    delivered: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
