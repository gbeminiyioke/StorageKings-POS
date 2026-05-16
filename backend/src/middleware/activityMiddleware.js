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
        const success = res.statusCode >= 200 && res.statusCode < 400;

        if (success && !res.locals.skipActivityLog) {
          const description =
            typeof getDescription === "function"
              ? getDescription(req)
              : `${actionName} action performed in ${moduleName}`;

          //console.log("REQ USER =", req.user);

          await logActivity({
            userId: req.user?.loginType === "staff" ? req.user?.id : null,
            customerId:
              req.user?.loginType === "customer" ? req.user?.id : null,
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
