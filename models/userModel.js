const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
    firstName : {
        type : String,
        required : [true, "firstName is required"]
    },
    lastName : {
        type : String,
        required : [true, "lastName is required"]
    },
    avatar : {
        type : String
    },
    about : {
        type : String
    },
    email : {
        type : String,
        required : [true, "Email field is required"],
        validate : {
            validator : function (email) {
                return String(email)
                       .toLowerCase()
                       .match(/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/)
            },
            message : (props) => `Email ${props.value} is invalid`
        }
    },

    password : {
        type : String,
        required : true
    },
    passwordConfirm : {
        type : String
    },
    passwordChangedAt : {
        type : Date
    },

    passwordResetToken : {
        type : String
    },
    passwordResetExpires : {
        type : Date
    },

    createdAt : {
        type : Date
    },
    updatedAt : {
        type : Date
    },
    verified : {
        type :Boolean,
        default : false
    },
    otp : {
        type : String
    },
    otp_expiry_time : {
        type : Date
    }
});

userSchema.pre("save", async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified("otp") || !this.otp) return next();
  
    // Hash the otp with cost of 12
    this.otp = await bcrypt.hash(this.otp.toString(), 12);
  
    console.log(this.otp.toString(), "FROM PRE SAVE HOOK");
  
    next();
  });
  
  userSchema.pre("save", async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified("password") || !this.password) return next();
  
    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });
  
  userSchema.pre("save", function (next) {
    if (!this.isModified("password") || !this.password)
      return next();
  
    this.passwordChangedAt = Date.now() - 1000;
    next();
  });
  
  userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
  ) {
    return await bcrypt.compare(candidatePassword, userPassword);
  };
  
  userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
    return await bcrypt.compare(candidateOTP, userOTP);
  };
  
  userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
      const changedTimeStamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimeStamp < changedTimeStamp;
    }
  
    // FALSE MEANS NOT CHANGED
    return false;
  };
  
  userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");
  
    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };


const User = new mongoose.model('User', userSchema);
module.exports = User