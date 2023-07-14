const expressAsyncHandler = require('express-async-handler');
const User = require('../models/userModel');

exports.updateMe = expressAsyncHandler(async (req, res, next) => {

    try {
     
    const userDoc = await User.findByIdAndUpdate(req.user._id, {...req.body});
    res.status(200).json({
      status: "success",
      data: userDoc,
      message: "User Updated successfully",
    });

    } catch (error) {
        throw new Error(error)
    }
  });