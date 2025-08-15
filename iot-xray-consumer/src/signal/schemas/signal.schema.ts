import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PointInfoDto } from '../../consumer/types';

/**
 * Represents a single processed signal containing time-series telemetry data from a device.
 *
 * This Mongoose schema stores a collection of `PointInfoDto` objects for a specific
 * device, along with metadata such as the signal's unique ID, timestamp, and
 * the size and volume of the data.
 */
@Schema({ timestamps: true })
export class Signal extends Document {
  // We use 'declare' to tell TypeScript that this property is managed by Mongoose.
  // This prevents conflicts with the properties of the Document class.
  declare id: string;
  declare _id: Types.ObjectId;

  /**
   * A unique identifier for each processed signal.
   *
   * This UUID is generated for each incoming message payload.
   */
  @Prop({ required: true, index: true, unique: true })
  uuid: string;

  /**
   * The unique identifier for the device that generated the data.
   */
  @Prop({ required: true, index: true })
  deviceId: string;

  /**
   * The timestamp of the message creation, typically the time when the data
   * was received or published.
   */
  @Prop({ required: true })
  time: number;

  /**
   * The total number of data points (i.e., the number of elements) in the `data` array.
   */
  @Prop({ required: true })
  dataLength: number;

  /**
   * The estimated size of the data array in bytes, useful for tracking data volume.
   */
  @Prop({ required: true })
  dataVolume: number;

  /**
   * An array of `PointInfoDto` objects, each representing a location and speed
   * data point at a specific time.
   */
  @Prop({ type: [PointInfoDto], required: true })
  data: PointInfoDto[];
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
