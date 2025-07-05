/* const globalErrorHandlingFunction = (err, req, res, next) => {
  
  err.statusCode = err.statusCode || 500; // creating statusCode property on err obj

  err.status = err.status || "error"; // creating status property on err obj

  // return res.status(err.statusCode).json({
  //   status: err.status,
  //   message: err.message
  // });

  if (process.env.NODE_ENV == "development") {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message, // whatever we pass inside new Error("...") is by default message
      stack: err.stack,
      name: err.name,
      error: err,
    });
  } else if (process.env.NODE_ENV == "production") {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message, // whatever we pass inside new Error("...") is by default message
    });
  }
};

export { globalErrorHandlingFunction }; */

import { CustomError } from "./CustomError.js";

// some error will be thrown by mongoose as a validation error so that error will have no status and statusCode property

// --------------------------------------------------------------------------------------------

const devErrors = (res, err) => {
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message, // whatever we pass inside new Error("...") is by default message
    stack: err.stack,
    error: err,
  });
};

// --------------------------------------------------------------------------------------------

const castErrorHandler = (err) => {
  console.log({castErrorHandlerFunction: err});
  return new CustomError("Invalid id for the movie", 400)
  // if error is created using new CustomError(), then it has isOperation property true
}

const duplicateKeyErrorHandler = (err) => {
  console.log({duplicateKey: err});
  return new CustomError(`There is already movie with name '${err.keyValue.name}', Please use another name`, 400);
  // if error is created using new CustomError(), then it has isOperation property true
}

const mongooseValidationErrorHandler = (err) => {
  console.log({mongooseValidation: err});
  const errorMessages = Object.values(err.errors).map(val => val.message).join(". ");
  return new CustomError(`Invalid Input Data : ${errorMessages}`, 400);
  // if error is created using new CustomError(), then it has isOperation property true
}

const tokenExpiredErrorHandler = (err) => {
  console.log({tokenExpiredError: err});
  return new CustomError("jwt token has expired, Please login again!", 401);
} 

const jsonWebTokenErrorHandler = (err) => {
  console.log({JsonWebTokenError: err});
  return new CustomError("Invalid token, Please login again!", 401);
}

// --------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------

//  if NODE_ENV=production in .env file then this function is called

const prodErrors = (res, err) => {
  //  if error is created using new CustomError(), then it has isOperational property.
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message, // whatever we pass inside new Error("...") is by default message
    });
  }
  // ending general message, which are not handled according to error
  else {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong! Please try again later",
    });
  }
};

// ----------------------------------------------------------------------------------------------------------------------------
// ------ This is main global error handling function -------------------------------------------------------------------------


// anywhere in the program if next(err) fun has an args... then it is error and will be catch at globalErrorHandlingFunction
const globalErrorHandlingFunction = (err, req, res, next) => {
  
  err.statusCode = err.statusCode || 500; // creating statusCode property on err obj

  err.status = err.status || "error"; // creating status property on err obj

  if (process.env.NODE_ENV == "development") {

    console.error("DevERROR errorObj💥", err);

    devErrors(res, err);

  } else if (process.env.NODE_ENV == "production") {

    console.error("ProdERROR errorObj💥", err);

    if(err.name == "CastError"){
      err = castErrorHandler(err);  // this function return something that again store on err obj and that is sent in prodErrors(res, err)
      console.log({outputOfCasterrorHandler: err})
    }

    if(err.code == 11000){
      err = duplicateKeyErrorHandler(err);
      console.log({outputOfDuplicateKeyErrorHandler: err})
    }

    //  if we set error messages in mongoose Schema
    if(err.name == "ValidationError"){
      err = mongooseValidationErrorHandler(err);
      console.log({mongooseValidationErrorHandler: err})
    }

    if(err.name == "TokenExpiredError"){
      err = tokenExpiredErrorHandler(err);
      console.log({tokenExpiredError: err});
    }

    if(err.name == "JsonWebTokenError"){
      err = jsonWebTokenErrorHandler(err);
    }

    // and finally send err obj to prodErrors(res, err) function and return an response.
    prodErrors(res, err);

  }
};

export { globalErrorHandlingFunction };

// some error will be thrown by mongoose as a validation error so that error will have no status and statusCode property

// if improper id is given,, then mongoose is not converted it into ObjectId().