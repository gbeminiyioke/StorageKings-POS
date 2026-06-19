import jwt from "jsonwebtoken";

/*-----------------------------------
  JWT CONFIGURATION
-------------------------------------*/
export const JWT_SECRET = process.env.JWT_SECRET;
export const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
export const JWT_EXPIRES = process.env.JWT_EXPIRES || "2h";
export const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "3d";

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
/*export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
*/

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
};
