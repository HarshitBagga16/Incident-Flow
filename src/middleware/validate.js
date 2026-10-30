export const validateRegister = (rulesSchema) => {
    return (req, res, next) => {
        const result = rulesSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message : "Validation Failed",
                errors: result.error.issues,
                success : false,
            });
        }
        req.body = result.data;
        next()
    }
}