import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PointInfoDto } from '../../consumer/types';

@Schema({ timestamps: true })
export class Signal extends Document {
  // We use 'declare' to tell TypeScript that this property is managed by Mongoose.
  // This prevents conflicts with the properties of the Document class.
  declare id: string;
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true, unique: true })
  uuid: string; // UUID generated for each processed signal.

  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true })
  time: number;

  @Prop({ required: true })
  dataLength: number; // The length of the data array.

  @Prop({ required: true })
  dataVolume: number; // The estimated size of the data array in bytes.

  @Prop({ type: [PointInfoDto], required: true })
  data: PointInfoDto[];
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
