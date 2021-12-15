
import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import HTTP_STATUS from "../../../../libs/HTTPStatus";
import Classrooms from "../../../../services/Classrooms";
import { ServiceError } from "../../../../exception/Errors";

class Meetings {
    public static async perform(req: any, res: any, next: any) {
        try {
            let reqToken = Sessions.extractTokenHeader(req);
            //let sessionOwner = await Sessions.getTokenOwner(reqToken);
            let meetings;

            if (!req.query.cache) {
                try {
                    meetings = await Classrooms.getMeetings(reqToken, false)
                } catch (err: any) {
                    Logger.log('warn', 'Cannot get google meetings data');
                    Logger.log('warn', err.stack);

                    if (err.message.includes("Insufficient Permission")) {
                        throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Access to your google data was denied, please re-authenticate");
                    }

                    throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unable to fetch Google Calendar data");

                }

            }
            else {
                meetings = await Classrooms.getMeetings(reqToken, true);
            }

            return res.status(HTTP_STATUS.OK).json({ meetings });
        }
        catch (err) { next(err) }
    }
}

export default Meetings
