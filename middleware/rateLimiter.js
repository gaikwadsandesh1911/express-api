import rateLimit from 'express-rate-limit';

const appLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 100,  // 100 req in 15 min
  message: "Too many requests from this IP, please try again later.",
});

// rate limiting can also applied to perticular route.
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    // message: 'Too many login attempts, please try again after 5 min'
    handler: (req, res, next, options) => {
        res.status(429).json({
            status: 'fail',
             message: options.message || 'You sent too many requests. Please try again later.',
        });
    }  
});

export { appLimiter, loginLimiter };

/* 
    These are middleware function, can be add on route
*/