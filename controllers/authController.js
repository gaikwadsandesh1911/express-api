import { User } from "../models/userSchema.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { CustomError } from "../utils/CustomError.js";
import jwt from "jsonwebtoken";
import util from "util";
import { sendEmail } from "../utils/email.js";
import crypto from 'crypto';

// --------------------------------------------------------------
// generate jwt token.
const signInToken = (id) => {
  return jwt.sign({ id: id }, process.env.SECRET_STR, {
    expiresIn: process.env.LOGIN_EXPIRES || "30d",
  });
};

// ---------------------------------------------------------------

const createRespone = (user, statusCode, res) => {

  const token = signInToken(user._id);

  res.cookie('jwt', token, {
    maxAge: process.env.LOGIN_EXPIRES,
    httpOnly: true, // only server read can not accessed in browser
    secure: process.env.NODE_ENV === 'production', // in production mode cookie will be sent over https connection
    sameSite: 'lax' // protect against CSRF (Cross-Site Request Forgery) attacks.
   });

  return res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  })
};

// --------------------------------------------------------------

const signup = asyncErrorHandler(async (req, res, next) => {

  const newUser = await User.create(req.body);

  const { password, ...userWithoutPassword } = newUser._doc;

  createRespone(userWithoutPassword, 201, res);

  /* const token = signInToken(newUser._id);
  return res.status(201).json({
    status: "success",
    token: token,
    data: {
      user: userWithoutPassword,
    },
  }); */

});

// --------------------------------------------------------------

const login = asyncErrorHandler(async (req, res, next) => {

  const email = req.body.email;

  const pswd = req.body.password;

  if (!email || !pswd) {
    const err = new CustomError("please provide email and password for login!", 400);
    return next(err);
  }

  // const user = await User.findOne({ email: email })

 /*
    if user is soft-deleted meand isActive: false  => then this will not work
    please see userSchema.pre(/^find/, function(next)) before this line
*/

    
/* 
    user was soft-deleted and you want to allow them to log in
   .setOptions({ bypassActive: true });  => passing custom options to query.
    this.getOptions() =>	Access these options in middleware.
*/ 
  const user = await User.findOne({ email: email }).setOptions({ bypassActive: true });

  if (!user || !(await user.comparePassword(pswd))) {
    // comparePassword() defined in userSchema.js
    const err = new CustomError("Incorrect email or password", 400);
    return next(err);
  }
// if user soft-deleted active it again with login
  user.isActive = true;
  await user.save({validateBeforeSave: false});

  const { password, ...userWithoutPassword } = user._doc;

  createRespone(userWithoutPassword, 201, res);

  // generate sing in token.
  // const token = signInToken(user._id);

  /* return res.status(201).json({
    status: "success",
    user: userWithoutPassword,
    token,
  }); */
});

// --------------------------------------------------------------

const protect = asyncErrorHandler(async (req, res, next) => {
  // when user login token is sent in response that token is set in Authorization : Bearer token  in header
  const authHeader = req.headers?.authorization;
  let token;

  if (authHeader) {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.split(" ")[1]; // Bearer token
    } else {
      token = authHeader; // Raw token without prefix(Bearer)
    }
  }

  if (!token) {
    return next(new CustomError("Please logged in!", 401));
  }

  // if token available validate token and we get values we set at time of token geneation
  const decodedToken = await util.promisify(jwt.verify)(token, process.env.SECRET_STR);
  // console.log("decodedToken => ", decodedToken);

  // user exists
  const user = await User.findById(decodedToken.id);
  if(!user){
    const err = new CustomError("User with given token does not exists", 401);
    next(err); 
  }

  // ********************************************
  const { password, ...userWithoutPassword } = user.toObject();

  // on req obj we created user property... so,, req.user and assign user object on it.
  req.user = userWithoutPassword;
  next();

});

// ------------------------------------------------------------------------------------------------

// higher-order function takes role as parameter, returns an Express middleware function.
// here sendig role from movieRoutes file
const restrict = (...role) => {
    // console.log('role:', role);
    return (req, res, next)=>{
        if(!role.includes(req.user.role)){
            const err = new CustomError("You have no permission to perform this action", 403);
            next(err);
        }
        next();
    }
};

// we have to use restrict middleware only after protect middleware then only we can get [ req.user.role ]
// because on protect middleware we set req.user property, and to use protect middleware we have to login or sign in
//  flow wil be.....   login => protect => restrict

// -----------------------------------------------------------------------------------------------

const forgotPassword = asyncErrorHandler(async (req, res, next) => {
    
    // 1. get user based on email
    const user = await User.findOne({email: req.body.email});
    
    if(!user){
        return next(new CustomError("User does not exits with given email ", 404));
    }
    
    // 2. generate random reset token using instance method created at userSchema;
    const passwordResetToken =  user.generateResetPasswordToken();

    await user.save({validateBeforeSave: false}); // do not validate userSchema before save.

    // 3. send the token to user email
    const resetUrl = `${req.protocol}://${req.get("host")}/auth/resetPassword/${passwordResetToken}`;
    const message = `you have received a password reset token, Please use the below link to reset your password \n\n${resetUrl}\n\nThis reset password link will be valid for 10 minutes only.`
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password change request received',
        message: message
      });

      return res.status(200).json({
        status: "success",
        message: "password reset link send to the user email"
      })
      
    } catch (error) {

      user.passwordResetToken = undefined;
      user.passwordResetTokenExpires = undefined;

      // mongoose validation not work here
      user.save({validateBeforeSave: false});

      return next(new CustomError("There was an error sending password reset email. Please try again later", 500));
    }

});
// -----------------------------------------------------------------------------------------------------

const resetPassword = asyncErrorHandler(async (req, res, next) => {

  const token = crypto.createHash("sha256").update(req.params.token).digest('hex');

  const user = await User.findOne({passwordResetToken: token, passwordResetTokenExpires: {$gte: Date.now()}});
  // we have set passwordResetTokenExpires for 10min. if it is more than that then will not show euser

  if(!user){
    return next(new CustomError("Token is invalid or expired", 400));
  }

  // setting new password for the user
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;

// once password is created..  passwordResetToken and passwordResetTokenExpires should set to undefined
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;

  //  mongoose validation will work here
  await user.save();

  // login the user once password is changed.
  const loginToken = signInToken(user._id);

  return res.status(200).json({
    status: "success",
    token: loginToken
  });

});

// --------------------------------------------------------------------------------------------------------

const updatePassword = asyncErrorHandler(async (req, res, next) => {
  //  get  current user data, we use protect middleware on route so we get req.user._id
  const user = await User.findById(req.user._id).select('+password');

  // check if given password is correct with encrypted password from database.
  if(!(await user.comparePassword(req.body.currentPassword))){
    return next(new CustomError("current password you provided is wrong", 401));
  }

  // if given password is correct, update the password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;

  await user.save();

  // login user and send jwt token
  const token = signInToken(user._id);

  const { password, ...userWithoutPassword } = user.toObject();

  return res.status(200).json({
    status: "success",
    token: token,
    data: {
      user: userWithoutPassword
    }
  })
});

// --------------------------------------------------------------------------------------------------------

//  only allowed fields will be updated
const filterReqObj = (obj, ...allowedFields) => {
    const newObj = { };
    Object.keys(obj).forEach((props)=>{
      if(allowedFields.includes(props)){
        newObj[props] = obj[props]
      }
    })
    return newObj;
}

const updateMe = asyncErrorHandler(async(req, res, next) => {

  // should not use for updating email and password 

  if ( req.body.email || req.body.password || req.body.comfirmPassword) {
    return next(new CustomError("You cannot update email or password using this request", 400));
  }
  

  const filteredObj =  filterReqObj(req.body, 'name', 'photo');

  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredObj, { runValidators: true, new: true });
  
  const { password, ...userWithoutPassword } = updatedUser.toObject();

  return res.status(201).json({
    status: "success",
    user: userWithoutPassword
  });

});
// --------------------------------------------------------------------------------------------------------

// we are not going delete from database.. just make isActive: false
// on getAllUsers route will show users that has isActive: true
const deleteMe = asyncErrorHandler(async(req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  return res.status(200).json({
    status: "success",
    data: null
  })
});

// if we set status(204) ... then in respone we get nothing, only blank response.

// --------------------------------------------------------------------------------------------------------

const getAllUsers = asyncErrorHandler(async (req, res, next) => {
  
  const allActiveUsers = await User.find();
  
  return res.status(200).json({
    status: "success",
    data: {
      users: allActiveUsers
    }
  })
}); // see userSchema.pre('find')... before find query execute something

// --------------------------------------------------------------------------------------------------------

export { signup, login, protect, restrict, forgotPassword, resetPassword, updatePassword, updateMe, deleteMe, getAllUsers };


// post req to forgot pass, get user based on email, generate token and sending to email
// once user recieve email with reset token again will make post req to resetPassword fun


/* 
    we sending json web token in respone.. to use it on client side it has to save somewhere
    mostly it is saved on localStorage.. but it can be hacked with attack called cross-site-scriptig (xss) attack.

    so we going to send and recieve json web token through http cookie
    cookie is small piece of code that server can send to client

    when client recieve the cookie it will automatically saved it and 
    automatically send it back to server with all the future request that we make from that client to same server.

*/

