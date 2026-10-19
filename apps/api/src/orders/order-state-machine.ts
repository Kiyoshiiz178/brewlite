import { BadRequestException } from '@nestjs/common';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Valid state transitions as defined in specification section 9.1
 * - PENDING -> PAID, PAYMENT_FAILED, CANCELLED
 * - PAYMENT_FAILED -> PAID, CANCELLED
 * - PAID -> PREPARING, CANCELLED
 * - PREPARING -> READY
 * - READY -> COMPLETED
 * - COMPLETED, CANCELLED: terminal states (no outgoing transitions)
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY,
  ],
  [OrderStatus.READY]: [
    OrderStatus.COMPLETED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertTransition(currentStatus: string, nextStatus: string): void {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Chuyển trạng thái đơn hàng không hợp lệ: từ '${currentStatus}' sang '${nextStatus}'`,
    );
  }
}
