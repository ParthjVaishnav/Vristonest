// src/team B/appointment/appointment.controller.ts
import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Query, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppointmentService } from './appointment.service';
import { Appointment } from './appointment.entity';

@Controller('appointment')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('photo'))
  async createOrUpdate(
    @Body() data: Partial<Appointment>,
    @UploadedFile() photo: Express.Multer.File,
  ): Promise<Appointment> {
    try {
      return await this.appointmentService.createOrUpdateAppointment({
        ...data,
        photo: photo ? photo.buffer.toString('base64') : data.photo,
      });
    } catch (error) {
      // Re-throw the error to ensure proper HTTP response
      throw error;
    }
  }

  @Get('check-status')
  async checkFormStatus(
    @Query('email') visitorEmail: string,
    @Query('date') date: string,
    @Query('time') allocatedTime: string,
  ): Promise<{ isFormCompleted: boolean }> {
    // Validate query parameters
    if (!visitorEmail || !date || !allocatedTime) {
      throw new BadRequestException('Missing required query parameters: email, date, and time are required.');
    }

    const isFormCompleted = await this.appointmentService.checkFormStatus(visitorEmail, date, allocatedTime);
    return { isFormCompleted };
  }

  // New endpoint to check if national_id is already used
  @Get('check-national-id')
  async checkNationalId(@Query('national_id') nationalId: string): Promise<{ exists: boolean }> {
    if (!nationalId) {
      throw new BadRequestException('Missing required query parameter: national_id is required.');
    }

    const exists = await this.appointmentService.checkNationalId(nationalId);
    return { exists };
  }
}