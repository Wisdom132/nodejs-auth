const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/register", userController.registerNewUser);
router.get("/confirmation/:token", userController.confirmToken);
router.post("/resend", userController.resendConfirmationToken);
router.post("/forgot-password", userController.forgotPassword);
router.get("/reset-password/:token", userController.getUserToken);
router.post("/reset-password/:token", userController.resetPassword);
router.post("/login", userController.loginUser);
router.get("/getusers", userController.getAllUsers);

module.exports = router;
