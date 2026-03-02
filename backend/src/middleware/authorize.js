export const authorize = (permission) => {
  return (req, res, next) => {
    /*
    const permissions = req.user?.permissions;

    if (!permissions || permissions[permission] !== true) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
    */

    if (!req.user?.permissions?.[permission]) {
      return res.status(403).json({ message: "Access denied!" });
    }
    next();
  };
};
