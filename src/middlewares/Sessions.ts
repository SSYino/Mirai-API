import Express from "express";

import SessionService from "../services/Sessions";

class Sessions {
    public static init(_express: any): Express.Application {
        return _express;
    }

    public static async isAuthenticated(req: any, res: any, next: any) {

        let reqToken = SessionService.extractTokenHeader(req);
        
        if(!reqToken.success)
            return res.status(400).json({
                success: false,
                error: reqToken.error
            });
        
        req.token = reqToken.token;

        let result = await SessionService.validateToken(reqToken.token);
        
        if(result.valid)
            return next();
        
        return res.status(401).json({
            success: false,
            error: result.error,
        });
        
    }

}

export default Sessions;
