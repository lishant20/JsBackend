import mongoose from 'mongoose';

const likeSchema =new mongoose.Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video"
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment"
    }
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet"
    },
    likedBy: {
      type: Schema.Types.OjectId,
      ref: "User"
    }
  },
  {timestamps: true}
)

export const Like = mongoose.model("Like",likeSchema)