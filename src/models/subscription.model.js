import mongoose from "mongoose";

const subcriptionSchema  = new Schema({
  subscriber: {
    type: Schema.Typea.ObjectId, //one who is subscribing
    ref: "User"
  },
  channel: {
      type: Schema.Types.ObjectId, //one to whom 'subscriber' is subscribing
      ref: "User"
  }
},{timestamps: true})
//user ko profile display gardah problem aunah sakxah
//channel ni user nai ho
export const Subscription = mongoose.model("Subcription", subcriptionSchema);
