import  rateLimit from 'next-rate-limit';

export const limiter = rateLimit({
  interval: 60 * 1000, 
  uniqueTokenPerInterval: 500, 
});
