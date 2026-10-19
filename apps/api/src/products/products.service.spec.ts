import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockPrismaService: any;

  const mockProduct = {
    id: 1,
    name: 'Cà phê sữa đá',
    price: 35000,
    imageUrl: 'http://img.com/coffee.jpg',
    stock: 50,
    version: 0,
  };

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findMany: vi.fn().mockResolvedValue([mockProduct]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) return Promise.resolve(mockProduct);
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 2, ...data }),
        ),
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ ...mockProduct, ...data, id: where.id }),
        ),
        delete: vi.fn().mockResolvedValue(mockProduct),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('trả về danh sách sản phẩm', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockProduct]);
      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('trả về sản phẩm nếu tìm thấy', async () => {
      const result = await service.findOne(1);
      expect(result).toEqual(mockProduct);
    });

    it('ném lỗi NotFoundException (404) nếu không tìm thấy', async () => {
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo sản phẩm mới thành công', async () => {
      const dto = {
        name: 'Trà đào',
        price: 39000,
        imageUrl: 'http://img.com/tea.jpg',
        stock: 20,
      };
      const result = await service.create(dto);
      expect(result.id).toBe(2);
      expect(result.name).toBe('Trà đào');
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          price: dto.price,
          imageUrl: dto.imageUrl,
          stock: dto.stock,
          version: 0,
        },
      });
    });
  });

  describe('update', () => {
    it('cập nhật sản phẩm thành công', async () => {
      const result = await service.update(1, { price: 38000 });
      expect(result.price).toBe(38000);
      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });

    it('ném NotFoundException nếu sản phẩm cần update không tồn tại', async () => {
      await expect(service.update(999, { price: 38000 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('xóa sản phẩm thành công', async () => {
      const result = await service.remove(1);
      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('ném NotFoundException nếu sản phẩm cần xóa không tồn tại', async () => {
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

