const router = require("express").Router();

const userController = require("../controller/userCtrl");
const authController = require("../controller/authCtrl");

router.patch("/update-me", authController.protect, userController.updateMe);



module.exports = router;
