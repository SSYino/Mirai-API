import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import UserService from "../../../../services/Users";
import HTTP_STATUS from "../../../../libs/HTTPStatus";

class Users {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {

            let AllUsers: any;

            if(!req.query)
                AllUsers = await UserService.getAllUser({});
            else
                AllUsers = await UserService.getAllUser(req.query);
     
            let userData = [];
            for(let user of AllUsers) {
                userData.push({
                    profile: {
                        family_name: user.family_name,
                        given_name: user.given_name,
                        id: user.id,
                        picture_url: user.picture_url,
                        email: user.email
                    },
                    isAdmin: user.isAdmin,
                    isDeveloper: user.isDeveloper,
                    isTeacher: user.isTeacher,
                    isStudent: user.isStudent,
                    isSuspended: user.isSuspended
                });
            }

            if(req.query) {
                if(!req.query.role && !req.query.search && !req.query.status)
                    return res.status(HTTP_STATUS.OK).json({
                        total: (await UserService.getAllUser({})).length,
                        users: userData
                    });
                else
                    return res.status(HTTP_STATUS.OK).json({
                        total: AllUsers.length,
                        users: userData
                    });
            }   
            return res.status(HTTP_STATUS.OK).json(userData);
            
        }).catch(next);
    }
}

export default Users;
