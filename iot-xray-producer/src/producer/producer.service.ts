import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exchangeName } from '../common/exchange';
import { XrayDataRequestDto } from './types/xray-data.type';

/**
 * Service responsible for publishing x-ray data messages to a RabbitMQ exchange.
 *
 * It handles loading sample data from a file, and provides methods to publish
 * messages either periodically or from an external source like an HTTP request.
 */
@Injectable()
export class ProducerService {
  private readonly logger = new Logger(ProducerService.name);
  private sampleData: XrayDataRequestDto;

  constructor(private readonly amqpConnection: AmqpConnection) {
    this.sampleData = this.loadXrayData();
  }

  /**
   * Loads sample x-ray data from a local JSON file.
   *
   * This method reads 'x-ray.json' from the project directory. If the file is
   * not found or is invalid, it logs an error and returns an empty object.
   *
   * @returns The parsed data from the JSON file or an empty object if loading fails.
   */
  private loadXrayData(): XrayDataRequestDto {
    try {
      const filePath = path.join(__dirname, '../../x-ray.json');
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContents);
    } catch (error) {
      this.logger.error('Failed to load x-ray data from file:', error);
      return {};
    }
  }

  /**
   * Publishes messages for each device in the provided payload to the RabbitMQ exchange.
   *
   * This is a private helper method that iterates through a data payload, constructs
   * a routing key for each device, and publishes a separate message for each.
   * It logs the result of each publish operation, including any errors.
   *
   * @param devices The payload containing data for one or more devices.
   * @param source A string indicating the source of the data (e.g., 'periodic job', 'HTTP request').
   * @returns A promise that resolves to an array of results for each publishing attempt.
   */
  private async _publishMessage(
    devices: XrayDataRequestDto,
    source: string,
  ): Promise<any[]> {
    const results: { success: boolean; message: string; error?: string }[] = [];

    for (const [deviceId, deviceData] of Object.entries(devices)) {
      const routingKey = `xray.data.${deviceId}`;

      const message: XrayDataRequestDto = {
        [deviceId]: deviceData,
      };

      try {
        await this.amqpConnection.publish(exchangeName, routingKey, message);
        this.logger.log(
          `Published a message to exchange "${exchangeName}" with routing key "${routingKey}" for device "${deviceId}" from ${source}`,
        );
        results.push({
          success: true,
          message: `Data for device ${deviceId} published successfully`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to publish message for device ${deviceId} from ${source}:`,
          error,
        );
        results.push({
          success: false,
          message: `Failed to publish data for device ${deviceId}`,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Publishes the pre-loaded sample data to the RabbitMQ exchange.
   *
   * This method is typically used by a cron job or scheduled task to
   * periodically send sample data for testing purposes.
   *
   * @returns A promise that resolves when all messages have been published.
   */
  public async publishSampleData() {
    await this._publishMessage(this.sampleData, 'periodic job');
  }

  /**
   * Publishes a data payload received from an HTTP request to the RabbitMQ exchange.
   *
   * This method is used by the `ProducerController` to handle manual publishing
   * of messages via an API endpoint.
   *
   * @param payload The data payload received from the HTTP request body.
   * @returns A promise that resolves to the result of the message publishing operation.
   */
  public async publishDataFromHttp(payload: XrayDataRequestDto) {
    return await this._publishMessage(payload, 'HTTP request');
  }
}
