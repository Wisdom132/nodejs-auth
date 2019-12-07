const mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    Required: true
  },
  email: {
    type: String,
    Required: true,
    unique: true
  },
  username: {
    type: String,
    Required: true
  },
  isVerified: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  password: {
    type: String,
    Required: true
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
  // history: [
  //   {
  //     paid: {
  //       type: Number,
  //       default: 0
  //     },
  //     item: {
  //       type: Schema.Types.ObjectId,
  //       ref: "Product"
  //     },
  //     category: {
  //       type: Schema.Types.ObjectId,
  //       ref: "Category"
  //     }
  //   }
  // ]
});

userSchema.plugin(uniqueValidator);
module.exports = mongoose.model("User", userSchema);
