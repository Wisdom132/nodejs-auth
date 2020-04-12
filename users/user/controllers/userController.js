require('dotenv').config()
const express = require("express");
const User = require("../model/User");
const Token = require("../model/Token");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const async = require("async");
const jwt = require("jsonwebtoken");

//Define nodemailer transporter
let transporter = nodemailer.createTransport({
  // host: "mail.google.com",
  service: "gmail",
  // port: 587,
  secure: false,
  auth: {
    user: proces.env.EMAIL,
    pass: proces.env.PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});
//nodemailer transporter ends here

//Register New User
exports.registerNewUser = async (req, res) => {
  // check if email is in use

  let checkuser = await User.find({
    email: req.body.email
  });
  if (checkuser.length >= 1) {
    res.status(400).json({
      error: "Email Already in use"
    });
  } else {
    let user = new User({
      name: req.body.name,
      email: req.body.email,
      username: req.body.username,
      password: await bcrypt.hash(req.body.password, 10)
    });
    user.save((err, user) => {
      if (err) {
        res.status(400).json({
          error: err
        });
      }

      //generate new token using crypto
      let token = new Token({
        _userId: user._id,
        token: crypto.randomBytes(16).toString("hex")
      });
      token.save(err => {
        if (err) {
          res.status(400).json({
            error: err
          });
        }

        let mailOptions = {
          from: "no-reply@gstore.com",
          to: user.email,
          subject: "Account Verification Token",
          // this is the body of the mail that is sent the the valid user
          text: "Hello,\n\n" +
            "Please verify your account by clicking the link: \nhttp://" +
            req.headers.host +
            "/user/confirmation/" +
            token.token +
            ".\n"
        };

        //send mail to user
        transporter.sendMail(mailOptions, err => {
          if (err) {
            return res.status(500).send({
              msg: err.message
            });
          }
          res
            .status(200)
            .send("A verification email has been sent to " + user.email + ".");
        });
      });
    });
  }
};

//confirm Email
exports.confirmToken = async (req, res, next) => {
  Token.findOne({
    token: req.params.token
  }, (err, token) => {
    if (!token)
      return res.status(400).send({
        type: "not-verified",
        msg: "We were unable to find a valid token. Your token my have expired."
      });

    User.findOne({
      _id: token._userId
    }, (err, user) => {
      if (!user)
        return res.status(400).send({
          msg: "We were unable to find a user for this token."
        });

      if (user.isVerified)
        return res.status(400).send({
          type: "already-verified",
          msg: "This user has already been verified."
        });

      user.isVerified = true;
      user.save(err => {
        if (err) {
          return res.status(500).send({
            msg: err
          });
        }
        res.status(200).send("The account has been verified. Please log in.");
      });
    });
  });
};
exports.resendConfirmationToken = async (req, res, next) => {
  User.findOne({
    email: req.body.email
  }, (err, user) => {
    //check for errors
    if (err) {
      return res.status(500).send({
        msg: err
      });
    }
    //check if user exist
    if (!user) {
      if (err) {
        return res.status(404).send({
          msg: "User Not Found"
        });
      }
    }
    //check if user verified status is true
    if (user.isVerified) {
      return res.status(400).send({
        msg: "This account has already been verified. Please login."
      });
    }

    let token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString("hex")
    });
    token.save(err => {
      if (err) {
        return res.status(500).send({
          msg: err.message
        });
      }

      let mailOptions = {
        from: "no-reply@yourwebapplication.com",
        to: user.email,
        subject: "Account Verification Token",
        // this is the body of the mail that is sent the the valid user
        text: "Hello,\n\n" +
          "Please verify your account by clicking the link: \nhttp://" +
          req.headers.host +
          "/confirmation/" +
          token.token +
          ".\n"
      };

      transporter.sendMail(mailOptions, err => {
        if (err) {
          return res.status(500).send({
            msg: err.message
          });
        }
        res
          .status(200)
          .send("A verification email has been sent to " + user.email + ".");
      });
    });
  });
};

exports.forgotPassword = (req, res) => {
  async.waterfall(
    [
      //first function ==> to find user
      done => {
        // find user with his or her email
        User.findOne({
          email: req.body.email
        }).exec((err, user) => {
          if (user) {
            done(err, user);
          } else {
            done("User not found.");
          }
        });
      },
      //second function ===> to generate token
      (user, done) => {
        // create the random token
        crypto.randomBytes(16, (err, buffer) => {
          let token = buffer.toString("hex");
          done(err, user, token);
        });
      },
      // third function ===> find user email and the assign reset_password_token to the generated token
      (user, token, done) => {
        console.log(user);
        // find user using the user id and set the reset password token to the generated token
        User.findByIdAndUpdate(
          {
            _id: user._id
          },
          {
            resetPasswordToken: token,
            resetPasswordExpires: Date.now() + 86400000
          },
          {
            upsert: true,
            new: true
          }
        ).exec(function(err, new_user) {
          done(err, token, new_user);
        });
      },
      // forth function ==> create simple email template
      (token, user, done) => {
        let data = {
          to: user.email,
          from: "no-reply@yourwebapplication.com",
          template: "forgot-password-email",
          subject: "Password help has arrived!",
          text: "Hello,\n\n" +
            "Please reset you password by clicking the link: \nhttp://" +
            req.headers.host +
            "/user/reset-password/" +
            token
        };

        //action to send token to user
        transporter.sendMail(data, err => {
          if (!err) {
            return res.json({
              message: "Kindly check your email for further instructions"
            });
          } else {
            res.status(200).json({
              message: err
            });
          }
        });
      }
    ],
    err => {
      return res.status(422).json({
        message: err
      });
    }
  );
};

exports.resetPassword = (req, res) => {
  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  }).exec((err, user) => {
    if (!err && user) {
      if (req.body.newPassword === req.body.verifyPassword) {
        user.password = bcrypt.hashSync(req.body.newPassword, 10); //hash the new password
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.save(err => {
          if (err) {
            return res.res.status(422).send({
              message: err
            });
          } else {
            let data = {
              to: user.email,
              from: "no-reply@yourwebapplication.com",
              template: "forgot-password-email",
              subject: "Password Changed!",
              text: "Hello,\n\n" +
                "This is a confirmation that the password for your account " +
                user.email +
                " has just been changed.\n"
            };

            transporter.sendMail(data, err => {
              //send mail to the new user
              if (!err) {
                return res.json({
                  message: "Password Reset"
                });
              } else {
                res.status(200).json({
                  message: "Something Went Wrong",
                  error: err
                });
              }
            });
            res.status(200).json({
              message: "Password Changed Successfully"
            });
          }
        });
      } else {
        return res.status(422).json({
          message: "Passwords do not match"
        });
      }
    } else {
      return res.status(400).send({
        message: "Password reset token is invalid or has expired."
      });
    }
  });
};

exports.getUserToken = (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    },
    (err, user) => {
      if (!user) {
        res.status(500).json({
          error: err
        });
      } else {
        console.log({
          data: user
        });
      }
    }
  );
};
exports.loginUser = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({
    email: email
  }, (err, user) => {
    if (err) {
      res.status(404).json(err);
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Wrong Login Details"
      });
    }
    if (!user.isVerified) {
      return res.status(401).send({
        type: "not-verified",
        msg: "Your account has not been verified."
      });
    }

    bcrypt.compare(password, user.password, (err, isUser) => {
      if (err) {
        res.status(404).json(err);
      }
      if (isUser) {
        const token = jwt.sign(
          {
            data: {
              _id: user._id,
              username: user.username,
              name: user.name,
              email: user.email
            }
          },
          "secret",
          {
            expiresIn: 604800
          }
        );
        return res.status(200).json({
          success: true,
          token: token
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Wrong Login Details"
        });
      }
    });
  });
};

exports.getAllUsers = async (req, res) => {
  try {
    let response = await User.find();
    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({
      error: err
    });
  }
};
