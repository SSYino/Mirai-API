import Express from "express";

import UserService from "../services/Users";
import SessionService from "../services/Sessions";
import { ServiceError } from "../exception/Errors";
import HTTP_STATUS from "../libs/HTTPStatus";

class Users {
    public static init(_express: any): Express.Application {
        return _express;
    }

    public static async isAdmin(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
        let reqToken = SessionService.extractTokenHeader(req);
        let sessionOwner = await SessionService.getTokenOwner(reqToken);
      
        let result = await UserService.isAdmin(sessionOwner);
        
        if(result)
            return next();
       
        throw new ServiceError(HTTP_STATUS.FORBIDDEN, "You have insufficient privileges to perform this operation");
        }).catch(next);
    }
    
    public static async isDeveloper(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
        let reqToken = SessionService.extractTokenHeader(req);
        let sessionOwner = await SessionService.getTokenOwner(reqToken);
      
        let result = await UserService.isDeveloper(sessionOwner);
        
        if(result)
            return next();
       
        throw new ServiceError(HTTP_STATUS.FORBIDDEN, "You have insufficient privileges to perform this operation");
        }).catch(next);
    }

}

export default Users;
