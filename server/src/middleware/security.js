import rateLimit from 'express-rate-limit';

// Strips keys like "$gt" or "a.b" so user input can't inject MongoDB operators.
function clean(value) {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else clean(value[key]);
    }
  }
  return value;
}

export const sanitize = (req, _res, next) => {
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});
