import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import UserService from "../../../../services/Users";
import HTTP_STATUS from "../../../../libs/HTTPStatus";
import Classrooms from "../../../../services/Classrooms";
import { ServiceError } from "../../../../exception/Errors";

class Classes {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {

            let reqToken = Sessions.extractTokenHeader(req);
            //let sessionOwner = await Sessions.getTokenOwner(reqToken);

            let userClasses;
            
            if(!req.query.cache) {
                try {
                    userClasses = await Classrooms.getClasses(reqToken, "ACTIVE", false);
                } catch (err: any) {
                    Logger.log('warn', 'Cannot get google classroom courses');
                    Logger.log('warn', err.stack);
        
                    if(err.message.includes("Insufficient Permission")) {
                        throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Access to your google data was denied, please re-authenticate");
                    }
        
                    throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unable to fetch Google Classroom data");
            
                }
            
            }
            else {
                userClasses = await Classrooms.getClasses(reqToken, "ACTIVE", true);
            }
            
            return res.status(HTTP_STATUS.OK).json({
                total: userClasses.length,
                classes: userClasses
            });
            
        }).catch(next);
    }
}

export default Classes;
