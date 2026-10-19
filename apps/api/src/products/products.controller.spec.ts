import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: any;

  const mockProduct = {
    id: 1,
    name: 'Cà phê sữa đá',
    price: 35000,
    imageUrl: 'http://img.com/coffee.jpg',
    stock: 50,
    version: 0,
  };

  beforeEach(async () => {
    mockProductsService = {
      findAll: vi.fn().mockResolvedValue([mockProduct]),
      findOne: vi.fn().mockResolvedValue(mockProduct),
      create: vi.fn().mockResolvedValue({ id: 2, name: 'Trà sen', price: 45000 }),
      update: vi.fn().mockResolvedValue({ ...mockProduct, price: 40000 }),
      remove: vi.fn().mockResolvedValue(mockProduct),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll gọi productsService.findAll và trả về danh sách', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([mockProduct]);
    expect(mockProductsService.findAll).toHaveBeenCalled();
  });

  it('findOne gọi productsService.findOne với id dạng số', async () => {
    const result = await controller.findOne(1);
    expect(result).toEqual(mockProduct);
    expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
  });

  it('create gọi productsService.create với dto', async () => {
    const dto = { name: 'Trà sen', price: 45000 };
    const result = await controller.create(dto);
    expect(result.id).toBe(2);
    expect(mockProductsService.create).toHaveBeenCalledWith(dto);
  });

  it('update gọi productsService.update với id và updateDto', async () => {
    const dto = { price: 40000 };
    const result = await controller.update(1, dto);
    expect(result.price).toBe(40000);
    expect(mockProductsService.update).toHaveBeenCalledWith(1, dto);
  });

  it('remove gọi productsService.remove với id', async () => {
    const result = await controller.remove(1);
    expect(result).toEqual(mockProduct);
    expect(mockProductsService.remove).toHaveBeenCalledWith(1);
  });
});

