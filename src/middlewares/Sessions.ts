import Express from "express";

import UserService from "../services/Users";
import SessionService from "../services/Sessions";
import { ServiceError } from "../exception/Errors";
import HTTP_STATUS from "../libs/HTTPStatus";

class Sessions {
    public static init(_express: any): Express.Application {
        return _express;
    }

    public static isAuthenticated(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
            let reqToken = SessionService.extractTokenHeader(req);
            req.token = reqToken;

            let result = await SessionService.validateToken(reqToken);
            
            if(result) {
                let sessionOwner = await SessionService.getTokenOwner(reqToken);
                
                if(!await UserService.isSuspended(sessionOwner))
                    return next();
                else
                    throw new ServiceError(HTTP_STATUS.FORBIDDEN, "Your account is currently suspended");
            }
        }).catch(next);
    }

}

export default Sessions;
