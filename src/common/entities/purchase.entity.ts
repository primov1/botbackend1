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
import { Product } from './product.entity';

export const PURCHASE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

@Entity('purchases')
export class Purchase {
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
    productId: number | null;

    @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @Column({ type: 'int', default: 0 })
    bonus: number;

    @Index()
    @Column({
        type: 'varchar',
        default: 'pending',
    })
    status: PurchaseStatus;

    @Column({ type: 'boolean', default: false })
    reviewSubmitted: boolean;

    @Column({ type: 'varchar', default: '' })
    proofImage: string;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt: Date | null;

    @Column({ type: 'text', default: '' })
    reviewNote: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
