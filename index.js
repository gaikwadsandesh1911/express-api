import express from 'express'
import { dbConnect } from './utils/dbConnection.js';
import movieRoutes from './routes/movieRoutes.js';
import authRoutes from './routes/authRoutes.js'
import { globalErrorHandlingFunction } from './utils/globalErrorHandling.js';
import qs from 'qs'
import { appLimiter } from './middleware/rateLimiter.js';
import helmet from 'helmet';
import hpp from 'hpp';
import dotenv from 'dotenv';
dotenv.config();

import { CustomError } from './utils/CustomError.js';

const app = express();

app.set('query parser', str => qs.parse(str));
// useful for filtering query like ?duration[gte]=120 .. then only convert into proper mongdb {$gte: ''} format

/* helmet set http response headers to protect against attacks like xss and other
*/
// applying helmet to all route. we can set for perticular route as well as a middleware.
app.use(helmet());

/* Rate limiting. => Prevent DOS Attacks
  in order to restrict same ip address from making to many request to api
*/
// Apply limiter to all API routes starts with /api
app.use('/api', appLimiter);

/* expres.static is built-in middleware to serve static files.
  public is name of folder where static files are saved.

  /public/image/logo.png
  we can access direclty =>
  http://localhost:3000/images/logo.png

*/
app.use(express.static('./public'));

/*  app.use(express.json())
  It parses the JSON string of the request body into a JavaScript object.
  It’s commonly used when you are building an API that expects the client
  to send data in JSON format (like in POST, PATCH, or PUT requests).
*/
app.use(express.json({
  limit: '10kb'  // req.body can accept max 10kb data. rest of data will be truncate.
}));


/* hpp helps to prevent filtering duplicate query parameters.
  /api/products?filter=shoes&filter=electronics => not allow filter use twice
 */
app.use(hpp({
  whitelist: ['sort', 'actors']
  //  sort, actors allow multiple time => /api/products?actors=salman&actors=aish
}));


app.use("/api/movie", movieRoutes);
app.use("/api/auth", authRoutes);

//  default route.. response error using customError class
app.use((req, res, next)=>{
    const err = new CustomError(`Can't find ${req.originalUrl} on this server.`, 404);
    next(err);  // will sent to globalErrorHandlingFunction
});

// global error handling function, has four args where first arg is err
app.use(globalErrorHandlingFunction);

const port = process.env.PORT || 5555;

let server;

const startServer = async () => {
  try {
    await dbConnect();
    server = app.listen(port, () => {
      console.log(`🚀 Application is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("💥 Server not started due to DB connection failure.");
    process.exit(1);
  }

};
startServer();


/*  unhandledRejection is an event in Node.js that occurs when a Promise is rejected
    but no .catch() handler or try-catch block is attached to handle that rejection.

    if not handled
      1. server might continue running in an unstable state.
      2. You might leak memory, leave DB connections open, or miss critical errors.
*/
process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection:", err.name, err.message);

  if (server) {
    server.close(() => {
      console.log("🛑 Server closed due to unhandled promise rejection.");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

/*  uncaughtException is an event in Node.js that happens when your code throws an error
    that is not caught anywhere — even you write try-catch block and not in a promise rejection

    It’s when an unexpected, synchronous error occurs, and you forgot to catch it.  
*/
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.name, err.message);

  if (server) {
    server.close(() => {
      console.log('🛑 Server closed due to uncaught exception.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// 🔥 Optional: Graceful Shutdown for SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated!');
  });
});

// 

/* default route. if route does not match. must be last route

  app.use((req, res) => {
      res.status(404).json({
        status: "fail",
        message: `Can't find ${req.originalUrl} on this server.`
      });
  }); 
*/

/*  default route. if route does not match. must be last route. and sending error to global error handling middleware.
    if next() function has arg, it is treated as error
*/

/* default route with CustonError class

  app.use((req, res, next)=>{
      const err = new Error(`Can't find ${req.originalUrl} on this server.`);
      err.statusCode = 400;
      err.status = "fail"
      next(err);  // passing error object in next() function that will be caught in global error handling function.
  }); 
*/

/*  ****  order muset follow  ***
  1. Rate Limiting
  2. Helmet for Secure Headers
  3. Serving Static Files (like frontend assets)
  4. Body Parser
  5. Data Sanitization
      app.use(mongoSanitize());
      app.use(xss());
      app.use(hpp());
  6. Routes
      app.use('/api/v1/auth', authRoutes);

  7. default route
  8. error handling middleware
  9. process.on...

*/

/*  process is a global object in Node.js.

    1. It is used for access env variable,

    2. exit the app 
        process.exit(1); // Forcefully stop the app (1 means error)
        process.exit(0); // Stop the app normally

    3. event listners for error like
        process.on('eventname', ()=>{})

    4. can access runtime info.
        console.log(process.pid); // Process ID
        console.log(process.cwd()); // Current working directory
        console.log(process.memoryUsage()); // Memory usage details
*/