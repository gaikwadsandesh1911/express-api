// its higher order function used to eliminate repetative try-catch block and centrealize error handling.
export function asyncErrorHandler(asyncFunc) {  
  // Express-compatible middleware function.
  //  Express automatically provides req, res, and next when it executes middleware or route handlers.”
  //  if we directly call this fun. means we are calling immediately and not on provided route in express. thats why return(req, res, next)
  return (req, res, next) => {
    // Calling the original async function (func)
    // if promise rejected then catch block capture error and passes to global or centralize error handler fun
    asyncFunc(req, res, next).catch((err) => next(err)); 
  };
}