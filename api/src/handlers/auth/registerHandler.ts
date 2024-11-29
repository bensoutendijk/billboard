import { UserModel } from "../../models/user.model";

async function registerHandler(input, context) {
  const { body, userId } = input;

  // Input validation
  const { email, password, passwordConfirmation } = body;

  if (!email || !password || !passwordConfirmation) {
    throw new Error("Email, password, and password confirmation are required");
  }

  if (password !== passwordConfirmation) {
    throw new Error("Password confirmation does not match");
  }

  const existingUser = await UserModel.findByEmail(email);

  if (existingUser) {
    throw new Error("Email is already taken");
  }

  try {
    const finalUser = await UserModel.create(email, password);

    return finalUser;
  } catch (err) {
    throw new Error("Something went wrong. Please try again later.");
  }
}

// Express adapter
export async function expressAdapter(req, res, next) {
  const input = {
    body: req.body,
    userId: req.user?.id,
    params: req.params,
    query: req.query,
    headers: req.headers,
  };

  registerHandler(input)
    .then((result) => {
      res.status(result.statusCode).json(result.body);
    })
    .catch(next);
}

// Lambda adapter
export async function lambdaAdapter(event, context) {
  const input = {
    body: JSON.parse(event.body),
    userId: event.requestContext.authorizer?.userId,
    params: event.pathParameters,
    query: event.queryStringParameters,
    headers: event.headers,
  };

  const result = await createProductHandler(input, context);

  return {
    statusCode: result.statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(result.body),
  };
}
