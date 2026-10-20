import { describe, expect, it } from 'vitest';
import { calcUnitPrice, formatVnd, sizeExtra, toppingLabel } from '../app/lib/pricing';

describe('pricing (Task 4)', () => {
  it('size S không phụ thu, M +5.000đ, L +10.000đ', () => {
    expect(sizeExtra('S')).toBe(0);
    expect(sizeExtra('M')).toBe(5000);
    expect(sizeExtra('L')).toBe(10000);
  });

  it('giá 1 ly = giá gốc + phụ thu size', () => {
    expect(calcUnitPrice(35000, 'S', [])).toBe(35000);
    expect(calcUnitPrice(35000, 'M', [])).toBe(40000);
    expect(calcUnitPrice(35000, 'L', [])).toBe(45000);
  });

  it('mỗi topping cộng thêm 5.000đ', () => {
    expect(calcUnitPrice(35000, 'S', ['tranchau'])).toBe(40000);
    expect(calcUnitPrice(35000, 'M', ['tranchau', 'thach'])).toBe(50000);
  });

  it('toppingLabel trả về tên tiếng Việt, id lạ thì giữ nguyên', () => {
    expect(toppingLabel('tranchau')).toBe('Trân châu đen');
    expect(toppingLabel('khong-co')).toBe('khong-co');
  });

  it('formatVnd định dạng kiểu Việt Nam', () => {
    expect(formatVnd(45000)).toBe('45.000đ');
    expect(formatVnd(0)).toBe('0đ');
  });
});
