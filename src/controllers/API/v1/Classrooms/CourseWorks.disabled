import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import Classrooms from "../../../../services/Classrooms";

class CourseWorks {
    
    public static async perform(req: any, res: any) {

        let reqToken = Sessions.extractTokenHeader(req);

        if(!reqToken.success)
            return res.status(400).json({
                success: false,
                error: Sessions.extractTokenHeader(req).error
            });     

        let sessionOwner = await Sessions.getTokenOwner(reqToken.token);

        if(!sessionOwner.success)
            return res.status(400).json({
                success: false,
                error: sessionOwner.error
            });

        if(typeof sessionOwner.id == "undefined")
            throw new Error("Unable to lookup users, session owner object is null");

        let id = sessionOwner.id;
        let userCourseWork;
        try {
            userCourseWork = await Classrooms.getCourseWork(reqToken.token, "ACTIVE");
        } catch (err) {
            Logger.log('warn', 'Cannot get google classroom courses work');
            Logger.log('warn', err.stack);

            if(err.message.includes("Insufficient Permission")) {
                return res.status(500).json({
                    success: false,
                    error: 'Access to your google data was denied, please re-authenticate'
                });
            }

            return res.status(500).json({
                success: false
            });
    
        }
        
        return res.status(200).json({
            success: true,
            data: userCourseWork
        });

    }
}

export default CourseWorks;
