import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Item } from 'src/login+register/item.entity';
import { AuthGuard } from './auth.guard';


@Module({
  imports: [
    TypeOrmModule.forFeature([Item]),
    JwtModule.register({
      secret: 'your-secret-key', // Replace with a secure key (e.g., from .env)
      signOptions: { expiresIn: '1h' }, // Token expires in 1 hour
    }),
  ],
  providers: [AuthService, AuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}