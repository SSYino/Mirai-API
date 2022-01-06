
import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import HTTP_STATUS from "../../../../libs/HTTPStatus";
import Classrooms from "../../../../services/Classrooms";
import { ServiceError } from "../../../../exception/Errors";
import Express from "../../../../providers/Express";
import { Server } from 'socket.io';

class Chat {
    public static async perform(req: any, res: any, next: any) {
        try {
            // let reqToken = Sessions.extractTokenHeader(req);
            //let sessionOwner = await Sessions.getTokenOwner(reqToken);

            // if (!req.query.cache) {
            //     try {
            //         // meetings = await Classrooms.getMeetings(reqToken, isToday, false)
            //     } catch (err: any) {
            //         Logger.log('warn', 'Cannot get chat data');
            //         Logger.log('warn', err.stack);

            //         if (err.message.includes("Insufficient Permission")) {
            //             throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Access to your google data was denied, please re-authenticate");
            //         }

            //         throw new ServiceError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Unable to fetch Google Calendar data");

            //     }

            // }
            // else {
            //     // meetings = await Classrooms.getMeetings(reqToken, isToday, true);
            // }

            // TODO : Send all the socket rooms of client

            // return res.status(HTTP_STATUS.OK).json(["dsa", "dsaasd", "tewst", "gay"]);
        }
        catch (err) { next(err) }
    }
}

export default Chat
