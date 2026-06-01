import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'varchar', default: '' })
    image: string;

    @Column({ type: 'varchar' })
    uzum_url: string;

    @Column({ type: 'int', default: 0 })
    bonus: number;

    @Column({ type: 'varchar', default: '' })
    telegramChannel: string;

    @Column({ type: 'varchar', default: '' })
    instagram: string;

    @Column({ type: 'boolean', default: false })
    requireChannel: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
