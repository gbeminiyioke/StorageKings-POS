import jwt from "jsonwebtoken";

/*-----------------------------------
  JWT CONFIGURATION
-------------------------------------*/
export const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

export const JWT_EXPIRES = process.env.JWT_EXPIRES || "30m";

/*-----------------------------------
  SIGN TOKEN (HELPER)
-------------------------------------*/
export const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
};

/*-------------------------------------
  VERIFY TOKEN (HELPER)
---------------------------------------*/
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
