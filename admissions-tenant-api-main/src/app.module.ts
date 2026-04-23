import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { FormsModule } from './modules/forms/forms.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';

@Module({
  imports: [
    // Global config — reads .env automatically
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Rate Limiting — 10 requests per minute
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true, // dev only — creates/updates tables automatically
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    BranchesModule,
    FormsModule,
    LeadsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
