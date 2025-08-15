// consumer/xray-consumer.service.ts
import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { exchangeName } from '../common/exchange';
import { SignalService } from '../signal';
import { DeviceDto, type XrayDataRequestDto } from './types';

@Injectable()
export class ConsumerService {
  private readonly logger = new Logger(ConsumerService.name);

  constructor(private readonly signalService: SignalService) {}

  /**
   * Asynchronously processes incoming X-ray data messages from a RabbitMQ queue.
   *
   * This method is a RabbitMQ subscriber that listens for messages on the
   * 'xray_data_queue'. It handles the full message lifecycle, including
   * validation, processing, and error handling.
   *
   * It uses the 'Nack' object to manage message acknowledgments:
   * - A message is rejected and sent to a Dead Letter Queue (DLQ) if validation fails (`return new Nack(false)`).
   * - A message is re-queued if a system error occurs during processing (`return new Nack(true)`),
   * allowing for a retry.
   *
   * @param msg The raw message payload received from RabbitMQ.
   * @returns A promise that resolves to a 'Nack' object to control message acknowledgment,
   * either acknowledging, rejecting, or re-queueing the message.
   */
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
      const cleanedData = await this.cleanData(msg);

      if (!cleanedData) {
        this.logger.error('Invalid message structure received.');
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
   * Processes and validates a raw message payload from RabbitMQ.
   *
   * This function iterates through a message, which is expected to be an object
   * where each key represents a device. For each device, it transforms the raw
   * telemetry data into a structured DTO and performs validation. Invalid device
   * data is skipped and not included in the final output.
   *
   * The expected format for a device's data is an array of tuples:
   * `[timestamp, [latitude, longitude, speed]]`
   *
   * This is converted into an array of `PointInfoDto` objects for easier
   * processing and validation.
   *
   * @param msg The raw message object received from the RabbitMQ queue.
   * @returns A promise that resolves to a validated `XrayDataRequestDto` object,
   * containing only the valid device data. Returns `null` if the initial
   * message structure is invalid or if no valid device data is found.
   */
  private async cleanData(msg: any): Promise<XrayDataRequestDto | null> {
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

    //if data is empty then return null
    return Object.keys(transformedData).length === 0 ? null : transformedData;
  }
}
