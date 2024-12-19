import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jwt from "jsonwebtoken";
import { UserModel } from "./models/User";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const path = event.requestContext.http.path;
  const method = event.requestContext.http.method;

  // Handle POST /local
  if (path === "/local" && method === "POST") {
    const user: {
      email?: string;
      password?: string;
      passwordConfirmation?: string;
    } = JSON.parse(event.body || "{}");

    if (!user.email) {
      return {
        statusCode: 422,
        body: JSON.stringify({ email: "is required" }),
      };
    }

    if (!user.password) {
      return {
        statusCode: 422,
        body: JSON.stringify({ password: "is required" }),
      };
    }

    if (!user.passwordConfirmation) {
      return {
        statusCode: 422,
        body: JSON.stringify({ passwordConfirmation: "is required" }),
      };
    }

    if (user.password !== user.passwordConfirmation) {
      return {
        statusCode: 442,
        body: JSON.stringify({ passwordConfirmation: "does not match" }),
      };
    }

    const existingUser = await UserModel.findByEmail(user.email);

    if (!existingUser) {
      try {
        const finalUser = await UserModel.create(user.email, user.password);
        const token = UserModel.generateJWT(finalUser);

        return {
          statusCode: 200,
          headers: {
            "Set-Cookie": [
              `httpOnlyToken=Token ${token}; HttpOnly; Expires=${new Date(
                Date.now() + 1000 * 60 * 60 * 24 * 30
              ).toUTCString()}`,
              `token=Token ${token}; Expires=${new Date(
                Date.now() + 1000 * 60 * 60 * 24 * 30
              ).toUTCString()}`,
            ],
          },
          body: JSON.stringify(UserModel.toJSON(finalUser)),
        };
      } catch (err) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            authentication: "Something went wrong. Please try again later.",
          }),
        };
      }
    }

    return {
      statusCode: 442,
      body: JSON.stringify({ email: "already exists" }),
    };
  }

  // Handle POST /login
  if (path === "login" && method === "POST") {
    const user = JSON.parse(event.body || "{}");

    if (!user.email) {
      return {
        statusCode: 422,
        body: JSON.stringify({ email: "is required" }),
      };
    }

    if (!user.password) {
      return {
        statusCode: 422,
        body: JSON.stringify({ password: "is required" }),
      };
    }

    const existingUser = await UserModel.findByEmail(user.email);
    if (
      existingUser &&
      !UserModel.validatePassword(existingUser, user.password)
    ) {
      const token = UserModel.generateJWT(existingUser);

      return {
        statusCode: 200,
        headers: {
          "Set-Cookie": [
            `httpOnlyToken=Token ${token}; HttpOnly; Expires=${new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 30
            ).toUTCString()}`,
            `token=Token ${token}; Expires=${new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 30
            ).toUTCString()}`,
          ],
        },
        body: JSON.stringify(UserModel.toJSON(existingUser)),
      };
    }

    return {
      statusCode: 422,
      body: JSON.stringify({
        authentication: "Email and password combination not recognized.",
      }),
    };
  }

  // Handle GET /auth/current
  if (path === "/current" && method === "GET") {
    // Extract user from JWT token
    const token = event.headers.Authorization?.split(" ")[1];
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "No token provided" }),
      };
    }

    try {
      // Verify and decode token to get user.id
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.id);

      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      const newToken = UserModel.generateJWT(user);

      return {
        statusCode: 200,
        headers: {
          "Set-Cookie": [
            `httpOnlyToken=Token ${newToken}; HttpOnly; Expires=${new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 30
            ).toUTCString()}`,
            `token=Token ${newToken}; Expires=${new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 30
            ).toUTCString()}`,
          ],
        },
        body: JSON.stringify(UserModel.toJSON(user)),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Route not found" }),
  };
};
