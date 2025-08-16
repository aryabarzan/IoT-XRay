import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { XrayDataRequestDto } from '../common/types';
import { Signal } from './schemas';
import {
  CreateSignalDto,
  FilterSignalDto,
  PaginatedSignalsResponse,
  PaginationDto,
  UpdateSignalDto,
} from './type';

/**
 * Service for managing Signal documents in the database.
 *
 * This service provides methods for creating, retrieving, updating, and
 * deleting signals. It also includes specialized functionality for
 * processing and saving incoming X-ray data messages from RabbitMQ.
 */
@Injectable()
export class SignalService {
  private readonly logger = new Logger(SignalService.name);

  /**
   * Constructs the SignalService and injects the Mongoose Signal model.
   *
   * @param signalModel The Mongoose model for the Signal schema.
   */
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

  /**
   * Creates and saves a single new signal document.
   *
   * @param createSignalDto The DTO containing the data for the new signal.
   * @returns A promise that resolves to the newly created Signal document.
   */
  async create(createSignalDto: CreateSignalDto): Promise<Signal> {
    const createdSignal = new this.signalModel(createSignalDto);
    return createdSignal.save();
  }

  /**
   * Retrieves all signal documents from the database.
   *
   * @returns A promise that resolves to an array of all Signal documents.
   */
  async findAll(): Promise<Signal[]> {
    return this.signalModel.find().exec();
  }

  /**
   * Finds a single signal document by its unique UUID.
   *
   * @param id The UUID of the signal to find.
   * @returns A promise that resolves to the found Signal document, or null if not found.
   */
  async findOne(id: string): Promise<Signal | null> {
    return this.signalModel.findOne({ uuid: id }).exec();
  }

  /**
   * Updates an existing signal document by its UUID.
   *
   * @param id The UUID of the signal to update.
   * @param updateSignalDto The DTO containing the fields to update.
   * @returns A promise that resolves to the updated Signal document, or null if not found.
   */
  async update(
    id: string,
    updateSignalDto: UpdateSignalDto,
  ): Promise<Signal | null> {
    return this.signalModel
      .findOneAndUpdate({ uuid: id }, updateSignalDto, { new: true })
      .exec();
  }

  /**
   * Deletes a signal document by its UUID.
   *
   * @param id The UUID of the signal to delete.
   * @returns A promise that resolves to the deleted Signal document, or null if not found.
   */
  async delete(id: string): Promise<Signal | null> {
    return this.signalModel.findOneAndDelete({ uuid: id }).exec();
  }

  /**
   * Retrieves a paginated and filtered list of signals.
   *
   * This method supports filtering by device ID, UUID, time, data length, and data volume,
   * and provides a paginated response.
   *
   * @param filters The DTO containing the filters to apply.
   * @param pagination The DTO containing the pagination options (page and limit).
   * @returns A promise that resolves to an object containing the filtered data and pagination information.
   */
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

  /**
   * Deletes all signal documents associated with a specific device ID.
   *
   * @param deviceId The ID of the device whose signals should be deleted.
   * @returns A promise that resolves to an object with the number of deleted documents and a message.
   */
  async deleteByDeviceId(deviceId: string) {
    const result = await this.signalModel.deleteMany({ deviceId });
    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} signals deleted for deviceId: ${deviceId}`,
    };
  }
}
