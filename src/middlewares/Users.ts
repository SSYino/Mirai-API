import Express from "express";

import UserService from "../services/Users";
import SessionService from "../services/Sessions";

class Users {
    public static init(_express: any): Express.Application {
        return _express;
    }

    public static async isAdmin(req: any, res: any, next: any) {

        let reqToken = SessionService.extractTokenHeader(req);
        let sessionOwner = await SessionService.getTokenOwner(reqToken.token);

        if(!sessionOwner.success)
            return res.status(400).json({
                success: false,
                error: sessionOwner.error
            });

        if(typeof sessionOwner.id == "undefined")
            throw new Error("Unable to lookup users, session owner object is null");

        let result = await UserService.isAdmin(sessionOwner.id);
        
        if(result.result)
            return next();
        if(!result.result && !result.error) {
            return res.status(403).json({
                success: false,
                error: "You have insufficient privileges to perform this operation",
            });
        }
        
        return res.status(401).json({
            success: false,
            error: result.error,
        });
        
    }

}

export default Users;
