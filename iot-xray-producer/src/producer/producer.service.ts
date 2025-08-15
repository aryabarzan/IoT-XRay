import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exchangeName } from '../lib/exchange';
import { DeviceDto, XrayDataRequestDto } from './types';

@Injectable()
export class ProducerService {
  private readonly logger = new Logger(ProducerService.name);
  private sampleData: XrayDataRequestDto;

  constructor(private readonly amqpConnection: AmqpConnection) {
    this.sampleData = this.loadXrayData();
  }

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

  public async publishSampleData() {
    await this._publishMessage(this.sampleData, 'periodic job');
  }

  public async publishDataFromHttp(payload: XrayDataRequestDto) {
    return await this._publishMessage(payload, 'HTTP request');
  }
}
