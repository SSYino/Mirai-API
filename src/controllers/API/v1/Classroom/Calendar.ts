// import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
// import UserService from "../../../../services/Users";
import HTTP_STATUS from "../../../../libs/HTTPStatus";
import Classrooms from "../../../../services/Classrooms";
import { ServiceError } from "../../../../exception/Errors";

class Calendar {
    public static async perform(req: any, res: any, next: any) {
        try {
            let reqToken = Sessions.extractTokenHeader(req);
            //let sessionOwner = await Sessions.getTokenOwner(reqToken);

            let userCalendar;

            if (req.query.range && isNaN(parseInt(req.query.range)))
                throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "Not a valid range")

            const range: number = req.query.range ? parseInt(req.query.range) : 1;

            if (req.query.cache === 'false') {
                try {
                    userCalendar = await Classrooms.getCalendar(reqToken, false, range)
                } catch (err: any) {
                    Logger.log('warn', 'Cannot get google calendar data');
                    Logger.log('warn', err.stack);

                    if (err.message.includes("Insufficient Permission")) {
                        throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Access to your google data was denied, please re-authenticate");
                    }

                    throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unable to fetch Google Calendar data");

                }

            }
            else {
                userCalendar = await Classrooms.getCalendar(reqToken, true, range);
            }

            return res.status(HTTP_STATUS.OK).json({
                total: userCalendar.length,
                items: userCalendar
            });
        }
        catch (err) { next(err) }
    }
}

export default Calendar
