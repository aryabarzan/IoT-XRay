import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeviceDto, XrayDataRequestDto } from '../types/xray-data.type';

@Injectable()
export class XrayDataPipe implements PipeTransform {
  async transform(body: any) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException(
        'Invalid input format. Expected an object with a "devicesId" as key',
      );
    }

    const transformed: XrayDataRequestDto = {  };

    for (const deviceId in body) {
      const device = body[deviceId];
      if (!device || !Array.isArray(device.data)) {
        throw new BadRequestException(
          `Invalid data format for deviceId: ${deviceId}`,
        );
      }

      const mappedData = {
        data: device.data.map(([time, [x, y, speed]]) => ({
          time,
          coords: { x, y, speed },
        })),
        time: device.time,
      };

      const deviceDto = plainToInstance(DeviceDto, mappedData, {
        enableImplicitConversion: true,
      });

      const errors = await validate(deviceDto);
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }

      transformed[deviceId] = deviceDto;
    }

    return transformed;
  }
}
