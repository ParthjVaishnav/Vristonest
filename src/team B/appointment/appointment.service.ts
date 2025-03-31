// src/team B/appointment/appointment.service.ts
import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { MailService } from '../mail/mail.service';
import { VisitorMailService } from './visitor-mail/visitor-mail.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly mailService: MailService,
    private readonly visitorMailService: VisitorMailService,
  ) {}

  async createOrUpdateAppointment(data: Partial<Appointment>): Promise<Appointment> {
    try {
      // Check if national_id already exists in the database (only if provided)
      if (data.national_id) {
        const existingNationalId = await this.appointmentRepo.findOne({
          where: { national_id: data.national_id },
        });
        if (existingNationalId) {
          throw new BadRequestException('This National ID is already used for another appointment.');
        }
      }

      const existingAppointment = await this.appointmentRepo.findOne({
        where: {
          visitorEmail: data.visitorEmail,
          date: data.date,
          allocatedTime: data.allocatedTime,
        },
      });

      let savedAppointment: Appointment;

      if (existingAppointment) {
        // Update existing appointment (VisitorForm submission)
        savedAppointment = await this.appointmentRepo.save({
          ...existingAppointment,
          national_id: data.national_id || existingAppointment.national_id,
          photo: data.photo || existingAppointment.photo,
          mobile_number: data.mobile_number || existingAppointment.mobile_number,
          personal_details: data.personal_details || existingAppointment.personal_details,
          note: data.note || existingAppointment.note,
          isFormCompleted: true,
        });
        console.log(`✅ Updated appointment for ${savedAppointment.visitorEmail}`);
        await this.visitorMailService.sendVisitorQRCode(savedAppointment);
      } else {
        // Create new appointment (AppointmentForm submission)
        const appointment = this.appointmentRepo.create({
          firstName: data.firstName,
          lastName: data.lastName,
          date: data.date,
          allocatedTime: data.allocatedTime,
          visitorEmail: data.visitorEmail,
          national_id: data.national_id,
          photo: data.photo,
          mobile_number: data.mobile_number,
          personal_details: data.personal_details,
          note: data.note,
          isFormCompleted: false,
        });

        savedAppointment = await this.appointmentRepo.save(appointment);

        if (savedAppointment.visitorEmail && savedAppointment.date && savedAppointment.allocatedTime) {
          const formLink = `http://127.0.0.1:5500/apps-mailbox.html?email=${encodeURIComponent(savedAppointment.visitorEmail)}&time=${encodeURIComponent(savedAppointment.allocatedTime)}&date=${encodeURIComponent(savedAppointment.date)}&firstName=${encodeURIComponent(savedAppointment.firstName || '')}&lastName=${encodeURIComponent(savedAppointment.lastName || '')}`;
          await this.mailService.sendAppointmentEmail(
            savedAppointment.visitorEmail,
            savedAppointment.date,
            savedAppointment.allocatedTime,
            formLink,
          );
          console.log(`📩 Email sent to ${savedAppointment.visitorEmail} with form link: ${formLink}`);
        }
      }

      return savedAppointment;
    } catch (error) {
      console.error('❌ Error creating/updating appointment:', error);
      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException to be handled by the controller
      }
      throw new InternalServerErrorException('Failed to create or update appointment.');
    }
  }

  async checkFormStatus(visitorEmail: string, date: string, allocatedTime: string): Promise<boolean> {
    try {
      const appointment = await this.appointmentRepo.findOne({
        where: { visitorEmail, date, allocatedTime },
      });
      return appointment?.isFormCompleted || false;
    } catch (error) {
      console.error('❌ Error checking form status:', error);
      throw new InternalServerErrorException('Failed to check form status.');
    }
  }

  // New method to check if national_id exists
  async checkNationalId(nationalId: string): Promise<boolean> {
    try {
      const existingNationalId = await this.appointmentRepo.findOne({
        where: { national_id: nationalId },
      });
      return !!existingNationalId; // Returns true if national_id exists, false otherwise
    } catch (error) {
      console.error('❌ Error checking national_id:', error);
      throw new InternalServerErrorException('Failed to check National ID.');
    }
  }

  // src/team B/appointment/appointment.service.ts
async checkEmailExists(visitorEmail: string): Promise<boolean> {
  try {
    const existingEmail = await this.appointmentRepo.findOne({
      where: { visitorEmail },
    });
    return !!existingEmail; // Returns true if email exists, false otherwise
  } catch (error) {
    console.error('❌ Error checking email:', error);
    throw new InternalServerErrorException('Failed to check email existence.');
  }
}
}