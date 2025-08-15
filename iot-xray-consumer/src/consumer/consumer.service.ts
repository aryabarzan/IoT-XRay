// consumer/xray-consumer.service.ts
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeviceDto, type XrayDataRequestDto } from './types';
import { exchangeName } from '../lib/exchange';
import { SignalService } from '../signal';

@Injectable()
export class ConsumerService {
  private readonly logger = new Logger(ConsumerService.name);

  constructor(private readonly signalService: SignalService) {}

  @RabbitSubscribe({
    exchange: exchangeName,
    routingKey: 'xray.data.#',
    queue: 'xray_data_queue',
    queueOptions: {
      durable: true,
    },
  })
  public async handleXrayData(msg: any) {
    this.logger.log(`Received message from RabbitMQ.`);

    try {
      // Step 1: Filter and validate the incoming message payload
      const cleanedData = await this._cleanData(msg);

      if (!cleanedData) {
        this.logger.error('Invalid message structure received.');
        // Reject the message without requeueing it, sending it to the Dead Letter Queue (DLQ)
        return new Nack(false);
      }

      if (Object.keys(cleanedData).length === 0) {
        this.logger.warn('No valid device data found in the message.');
        // Reject the message without requeueing it, sending it to the Dead Letter Queue (DLQ)
        return new Nack(false);
      }

      // Step 2: If validation passes, process the message and save to the database
      await this.signalService.createSignal(cleanedData);
      this.logger.log(
        'Message content successfully sent to SignalService for processing.',
      );

      // Step 3: Acknowledge the message if everything was successful
      return new Nack(false);
    } catch (error) {
      this.logger.error(
        `A system error occurred while processing message. Error: ${error.message}`,
        error.stack,
      );

      // If other errors except validation error, requeue the message
      return new Nack(true);
    }
  }

  /**
   * validates, cleans, and transforms the raw message payload from RabbitMQ.
   *
   * This function iterates through each device in the incoming message,
   * transforms its data into the expected DTO format, and validates it.
   * Devices with invalid data are skipped.
   *
   * The expected input format for a device's data is an array of tuples:
   * `[timestamp, [latitude, longitude, speed]]`
   *
   * This is transformed into an array of `PointInfoDto` objects.
   *
   * @param msg The raw message object received from RabbitMQ.
   * @returns A promise that resolves to a validated `XrayDataRequestDto` object
   *          containing only the valid device data, or `null` if the initial
   *          message structure is invalid.
   */
  private async _cleanData(msg: any): Promise<XrayDataRequestDto | null> {
    if (!msg || typeof msg !== 'object') {
      return null; // Invalid device data structure
    }

    const transformedData: XrayDataRequestDto = {};

    for (const deviceId in msg) {
      if (Object.prototype.hasOwnProperty.call(msg, deviceId)) {
        const device = msg[deviceId];
        if (!device || !Array.isArray(device.data)) {
          continue; // Skip invalid device data
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
          continue; // Skip invalid device data
        }

        transformedData[deviceId] = deviceDto;
      }
    }

    return transformedData;
  }
}
