import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import UserService from "../../../../services/Users";
import HTTP_STATUS from "../../../../libs/HTTPStatus";

class Users {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
        
        return res.status(HTTP_STATUS.OK).json({});
        }).catch(next);
    }
}

export default Users;
