import logActivity from "../utils/activityLogger.js";

/*usage
  export const createRole = activityLogger("Roles", "Create", (async (req, res) => { ... })
*/

const activityMiddleware = (moduleName, actionName, getDescription) => {
  return (controller) => {
    return async (req, res, next) => {
      try {
        //run controller first
        await controller(req, res, next);

        //ONLY LOG IF REQUEST SUCCEEDS
        if (res.statusCode < 400 && !res.locals.skipActivityLog) {
          const description =
            typeof getDescription === "function"
              ? getDescription(req)
              : `${actionName} action performed in ${moduleName}`;

          await logActivity({
            userId: req.user?.id,
            userName: req.user?.fullname,
            branchId: req.user?.branchId,
            module: moduleName,
            action: actionName,
            description,
            ipAddress: req.ip,
          });
        }
      } catch (err) {
        next(err);
      }
    };
  };
};

export default activityMiddleware;
