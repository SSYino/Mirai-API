import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import Users from "../../../../services/Users";

class Me {
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

        let User = await Users.getUser(sessionOwner.id);

        if(!User.success)
            return res.status(400).json({
                success: false,
                error: User.error
            });

        if(typeof User.data == "undefined")
            throw new Error("Unable to lookup users, user object is null");
            
        return res.status(200).json({
            success: true,
            data: {
                id: User.data.id,
                given_name: User.data.given_name,
                family_name: User.data.family_name,
                picture_url: User.data.picture_url,
            }
        });
    }
}

export default Me;
