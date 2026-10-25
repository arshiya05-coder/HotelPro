import { ApiError } from '../utils/helpers.js';

// Validates req[source] against a zod schema and replaces it with the parsed (typed) data.
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();
      const details = formErrors.length ? { ...fieldErrors, _form: formErrors } : fieldErrors;
      return next(new ApiError(400, 'Validation failed', details));
    }
    req[source] = result.data;
    next();
  };
