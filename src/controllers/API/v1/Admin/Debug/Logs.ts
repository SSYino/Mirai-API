import RequestHelper from "../../../../../libs/RequestHelper";

import Logger from "../../../../../libs/Logger";

import Sessions from "../../../../../services/Sessions";
import Users from "../../../../../services/Users";

class Logs {
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

        let User = await Users.getAllUser();

        if(!User.success)
            return res.status(400).json({
                success: false,
                error: User.error
            });

        if(typeof User.data == "undefined")
            throw new Error("Unable to lookup users, user object is null");

        let userData = [];
        for(let user of User.data) {
            userData.push({
                id: user.id,
                given_name: user.given_name,
                family_name: user.family_name,
                picture_url: user.picture_url,
                isAdmin: user.isAdmin,
                isDeveloper: user.isDeveloper
            });
        }
            
        return res.status(200).json({
            success: true,
            data: userData
        });
    }
}

export default Logs;
