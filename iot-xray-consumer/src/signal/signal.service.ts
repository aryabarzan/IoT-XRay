import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { XrayDataRequestDto } from '../consumer';
import { Signal } from './schemas';
import {
  CreateSignalDto,
  FilterSignalDto,
  PaginatedSignalsResponse,
  PaginationDto,
  UpdateSignalDto,
} from './type';

@Injectable()
export class SignalService {
  private readonly logger = new Logger(SignalService.name);

  constructor(@InjectModel(Signal.name) private signalModel: Model<Signal>) {}

  /**
   * Processes an incoming message with X-ray data for multiple devices and saves each as a separate document.
   * This version uses Mongoose's insertMany() for bulk saving, which is more performant.
   * @param message The XrayDataRequestDto message containing data for one or more devices.
   * @returns A promise that resolves to an array of saved Signal documents, or an empty array if an error occurs.
   */
  async createSignal(message: XrayDataRequestDto): Promise<Signal[]> {
    try {
      const signalsToSave: Signal[] = [];

      // Iterate over each device ID in the incoming message
      for (const deviceId in message) {
        if (Object.prototype.hasOwnProperty.call(message, deviceId)) {
          const deviceData = message[deviceId];

          // Generate a unique ID for each individual signal
          const uuid = uuidv4();

          this.logger.log(
            `Preparing to save signal for device: ${deviceId} with generated UUID: ${uuid}`,
          );

          // Calculate the estimated size of the data array in bytes
          const dataVolume = Buffer.from(
            JSON.stringify(deviceData.data),
          ).length;

          const newSignal = new this.signalModel();
          newSignal.uuid = uuid;
          newSignal.deviceId = deviceId;
          newSignal.time = deviceData.time;
          newSignal.dataLength = deviceData.data.length;
          newSignal.dataVolume = dataVolume;
          newSignal.data = deviceData.data;

          // Create a new Mongoose document and add it to the array
          signalsToSave.push(new this.signalModel(newSignal));
        }
      }

      // Save all documents in a single bulk operation for better performance
      if (signalsToSave.length > 0) {
        const savedSignals = await this.signalModel.insertMany(signalsToSave);
        this.logger.log(
          `Successfully saved ${savedSignals.length} signals to the database.`,
        );
        return savedSignals;
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to save signals to database.', error.stack);
      return [];
    }
  }

  async create(createSignalDto: CreateSignalDto): Promise<Signal> {
    const createdSignal = new this.signalModel(createSignalDto);
    return createdSignal.save();
  }

  async findAll(): Promise<Signal[]> {
    return this.signalModel.find().exec();
  }

  async findOne(id: string): Promise<Signal | null> {
    return this.signalModel.findOne({ uuid: id }).exec();
  }

  async update(
    id: string,
    updateSignalDto: UpdateSignalDto,
  ): Promise<Signal | null> {
    return this.signalModel
      .findOneAndUpdate({ uuid: id }, updateSignalDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Signal | null> {
    return this.signalModel.findOneAndDelete({ uuid: id }).exec();
  }

  async findWithFilters(
    filters: FilterSignalDto,
    pagination: PaginationDto,
  ): Promise<PaginatedSignalsResponse> {
    const query: FilterQuery<Signal> = {};

    if (filters.deviceId) {
      query.deviceId = filters.deviceId;
    }
    if (filters.uuid) {
      query.uuid = filters.uuid;
    }
    if (filters.time) {
      query.time = { $gte: filters.time };
    }
    if (filters.dataLength) {
      query.dataLength = filters.dataLength;
    }
    if (filters.dataVolume) {
      query.dataVolume = filters.dataVolume;
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const totalCount = await this.signalModel.countDocuments(query).exec();
    const totalPages = Math.ceil(totalCount / limit);

    const data = await this.signalModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ time: -1 }) // Sort by time descending
      .exec();

    return {
      data,
      paginationInfo: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  async deleteByDeviceId(deviceId: string) {
    const result = await this.signalModel.deleteMany({ deviceId });
    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} signals deleted for deviceId: ${deviceId}`,
    };
  }
  
}
