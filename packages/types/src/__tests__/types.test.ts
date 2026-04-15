import { describe, it, expect } from 'vitest';
import type { User, Product, Order } from '../src';

describe('types', () => {
  it('exports User type', () => {
    const user: User = {
      id: 1,
      username: 'test',
      email: 'test@test.com',
      role: 'user',
      balance: 100,
    };
    expect(user.id).toBe(1);
  });

  it('exports Product type', () => {
    const product: Product = {
      id: 1,
      sellerId: 1,
      categoryId: 1,
      title: 'Test Product',
      description: null,
      gameName: 'Test Game',
      price: 100,
      originalPrice: 150,
      stock: 10,
      status: 'active',
      views: 0,
    };
    expect(product.status).toBe('active');
  });

  it('exports Order type', () => {
    const order: Order = {
      id: 1,
      buyerId: 1,
      productId: 1,
      quantity: 1,
      totalPrice: 100,
      status: 'pending',
      paymentMethod: 'stripe',
    };
    expect(order.status).toBe('pending');
  });
});