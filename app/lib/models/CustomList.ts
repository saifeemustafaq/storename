import mongoose, { Schema, Document } from "mongoose";

export interface ICustomList extends Document {
  name: string;
  items: number[];
}

const CustomListSchema = new Schema<ICustomList>(
  {
    name: { type: String, default: "default", unique: true },
    items: [{ type: Number }],
  },
  {
    toJSON: {
      transform(_doc, ret) {
        const { _id, __v, ...rest } = ret;
        void _id;
        void __v;
        return rest;
      },
    },
  }
);

export default mongoose.models.CustomList ||
  mongoose.model<ICustomList>("CustomList", CustomListSchema);
