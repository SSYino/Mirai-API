import Express from "express";

import SessionService from "../services/Sessions";

class Sessions {
    public static init(_express: any): Express.Application {
        return _express;
    }

    public static isAuthenticated(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
            let reqToken = SessionService.extractTokenHeader(req);
            req.token = reqToken;

            let result = await SessionService.validateToken(reqToken);
            
            if(result)
                return next();
        }).catch(next);
    }

}

export default Sessions;
