import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import UserService from "../../../../services/Users";
import HTTP_STATUS from "../../../../libs/HTTPStatus";

class Users {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
        //let reqToken = Sessions.extractTokenHeader(req);
        //let sessionOwner = await Sessions.getTokenOwner(reqToken.token);
        
        let AllUsers = await UserService.getAllUser();

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
                isStudent: user.isStudent
            });
        }
            
        return res.status(HTTP_STATUS.OK).json(userData);
        }).catch(next);
    }
}

export default Users;
