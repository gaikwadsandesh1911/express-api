class CustomError extends Error {
  constructor(message, statusCode) {
    super(message); // setting message in Error class. And on error.message property we get that error message.
    this.statusCode = statusCode; // creating statusCode property
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error"; // creating status property

    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); // to locate where are the errors in code
  }
}

export { CustomError };
// const err = new CustomError("something went wrong", 401)

/*
    if we create error using const err = new CustomError(), then this instance will have err.isOperational = true
    so we can create our logic acccordingly, because in app we will have other errors also, like mongodb error, programming error.
*/
