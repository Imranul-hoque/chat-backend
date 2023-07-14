const User = require('../models/userModel');
const expressAsyncHandler = require('express-async-handler');
const otpGenerator = require('otp-generator');
const jwt = require('jsonwebtoken');
const promisify = require('promisify');
const { sendEmail }  = require('../config/sendMail');
const crypto = require('crypto');
const {customBcrypt, compareBcrypt} = require('../config/customBcrypt');


const signToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn : '1d' });
}

exports.register = expressAsyncHandler(async (req,res,next) => {
    try {

        const { firstName, lastName,email, password } = req.body;

        const user_exists = await User.findOne({ email : email });

        if (user_exists && user_exists.verified) {
            res.status(400).json({
                status : 'error',
                message : "Email already user, please try with another one"
            })
        } else if (user_exists) {
            await User.findOneAndUpdate({ email :email }, {
                firstName,
                lastName,
                email,
                password
            }, {
                new : true,
                validateModifiedOnly : true
            });

            req.userId = user_exists._id;
            next();
        } else {
            const newUser = await User.create({
                firstName,
                lastName,
                email,
                password
            });

            req.userId = newUser._id;
            next()
        }


        
    } catch (error) {
        throw new Error(error)
    }
});

exports.sendOTP = expressAsyncHandler(async (req,res,next) => {
    try {
        const { userId } = req;
        const new_otp = otpGenerator.generate(6, {
            upperCaseAlphabets : false,
            lowerCaseAlphabets : false,
            specialChars : false
        });

        const otp_expiry_time = Date.now() + 10 * 60 * 1000;
        const user = await User.findByIdAndUpdate(userId, {
            otp_expiry_time : otp_expiry_time,
        });
    
        user.otp = new_otp;

        await user.save({
            new : true,
            validateModifiedOnly : true
        })

        console.log(new_otp);

        const htmlBody = ` your Login OTP is : ${new_otp}`

        sendEmail({
            to: user.email,
            subject: "Verification OTP",
            html: htmlBody,
          });

        res.status(200).json({
            status : "success",
            message : "OTP send successfully"
        })
    } catch (error) {
        throw new Error(error)
    }
});

exports.verifyOTP = expressAsyncHandler( async (req,res,next) => {


    try {

        const { email, otp } = req.body;

        if (!email || !otp) {
            res.status(400).json({
                status : "error",
                message : "OTP and valid email are required"
            })
            return;
        }

        const user = await User.findOne({
            email : email,
            otp_expiry_time : { $gt : Date.now()  }
        })

        if (!user) {
            res.status(400).json({
                status : 'error',
                message : 'Email is invalid or OTP Expired'
            })
            return;
        }



        if (user.verified) {
            res.status(400).json({
                status : 'error',
                message : "Email is already verified"
            })
            return;
        }

        if (otp !== user.otp) {
            res.status(400).json({
                status : 'error',
                message : "otp does not match"
            })
            return;
        }


        user.verified = true;
        user.otp = undefined;
        await user.save({
            new : true,
            validateModifiedOnly : true
        });

        const token = signToken(user._id);

        res.status(200).json({
            status : "success",
            message : "OTP verified successfully",
            token ,
            user_id : user._id
        })
        
    } catch (error) {
        throw new Error(error)
    }
});


exports.login = expressAsyncHandler( async (req,res,next) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                status : 'error',
                message : 'Both email and password are required '
            });
            return;
        }

        const user = await User.findOne({ email : email }).select("+password")

        if (!user || !user.password) {
            res.status(400).json({
                status : 'error',
                message : 'incorrect password'
            })
            return;
        }

        if (!user || !(await user.correctPassword(password, user.password))) {
            res.status(400).json({
                status : "error",
                message : "Email or password is incorrect"
            })
            return;
        }

        // Everything is ok than

        const token = signToken(user._id);

        res.status(200).json({
            status : 'success',
            message : "Logged in Successfully",
            token,
            user_id : user._id
        })
        
    } catch (error) {
        throw new Error(error)
    }
} )


exports.protect = expressAsyncHandler( async (req,res,next) => {
    try {
        let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];

    } else if (req.cookies.jwt) {
        token = req.cookies.jwt
    }


    if (!token) {
        res.status(401).json({
            message : "you are not logged in! please log in to get access."
        })
    }

    const decode  = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log(decode);

    const this_user = await User.findById(decode.userId);
    if (!this_user) {
        res.status(401).json({
            message : "The user belonging this token does no longer exists."
        })
    }

    if (this_user.changedPasswordAfter(decode.iat)) {
        res.status(401).json({
            message : "User recently changed password! Please log in again"
        })
    }

    req.user = this_user;
    next();
        
    } catch (error) {
        throw new Error(error)
    }
})


exports.forgotPassword = expressAsyncHandler( async (req,res,next) => {
    const { email } = req.body;

    const user = await User.findOne({ email : email })

    if (!user) {
        res.status(404).json({
            status : "error",
            message : "There is no user with that email"
        })
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({
        validateBeforeSave : false
    });

    try {
        const resetURL = `http://localhost:5000/auth/new-password?token=${resetToken}`;
    // TODO => Send Email with this Reset URL to user's email address

    console.log(resetURL);

    sendEmail({
        to: user.email,
        subject: "Reset Password",
        html :`<a href=${resetToken}>${resetToken}</a>`
      });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
        
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
    
        return res.status(500).json({
          message: "There was an error sending the email. Try again later!",
        });
    }


});

exports.resetPassword = expressAsyncHandler(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.body.token)
      .digest("hex");
  
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Token is Invalid or Expired",
      });
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  
    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    const token = signToken(user._id);
  
    res.status(200).json({
      status: "success",
      message: "Password Reseted Successfully",
      token,
    });
  });
  