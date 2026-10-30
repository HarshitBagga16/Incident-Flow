export const authorization = (...allowedRoles) => {
    return (req,res,next) => {
        if(!req.user)
        {
            return res.status(401).json(
                {
                    message: "Unauthorized",
                    success: false
                }
            )
        }
        if(!allowedRoles.includes(req.user.role))
        {
            return res.status(403).json(
                {
                    message: "Forbidden! User does not have the required role to access this resource",
                    success: false
                }
            )
        }
        return next();
    }
}