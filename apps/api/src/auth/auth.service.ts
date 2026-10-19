import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, pass: string) {
    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    // 2. Băm mật khẩu với bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(pass, saltRounds);

    // 3. Lưu user mới vào Database
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        loyaltyPoints: 0,
      },
    });

    return {
      message: 'Đăng ký thành công',
      userId: user.id,
      email: user.email,
    };
  }

  async login(email: string, pass: string) {
    // 1. Tìm user theo email
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    // 2. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    // 3. Tạo JWT token
    const payload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        loyaltyPoints: user.loyaltyPoints,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        loyaltyPoints: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return user;
  }
}