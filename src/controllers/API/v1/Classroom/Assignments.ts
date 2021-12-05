import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import UserService from "../../../../services/Users";
import HTTP_STATUS from "../../../../libs/HTTPStatus";
import Classrooms from "../../../../services/Classrooms";
import { ServiceError } from "../../../../exception/Errors";

class Assignments {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {

            let reqToken = Sessions.extractTokenHeader(req);
            //let sessionOwner = await Sessions.getTokenOwner(reqToken);

            let userAssignments;
            
            if(req.query.cache) {
                try {
                    userAssignments = await Classrooms.getAssignments(reqToken, "PUBLISHED", false);
                } catch (err: any) {
                    Logger.log('warn', 'Cannot get google classroom assignments');
                    Logger.log('warn', err.stack);
        
                    if(err.message.includes("Insufficient Permission")) {
                        throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Access to your google data was denied, please re-authenticate");
                    }
        
                    throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unable to fetch Google Classroom data");
            
                }
            
            }
            else {
                userAssignments = await Classrooms.getAssignments(reqToken, "PUBLISHED", true);
            }
            
            return res.status(HTTP_STATUS.OK).json({
                total: userAssignments.length,
                assignments: userAssignments
            });
            
        }).catch(next);
    }
}

export default Assignments;
