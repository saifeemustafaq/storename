import mongoose, { Schema, Document } from "mongoose";

export interface IIngredient extends Document {
  id: number;
  originalName: string;
  name: string;
  store: string;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    id: { type: Number, required: true, unique: true },
    originalName: { type: String, default: "" },
    name: { type: String, required: true },
    store: { type: String, required: true },
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

export default mongoose.models.Ingredient ||
  mongoose.model<IIngredient>("Ingredient", IngredientSchema);
