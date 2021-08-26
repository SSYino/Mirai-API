import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import Users from "../../../../services/Users";

class Me {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
            let reqToken = Sessions.extractTokenHeader(req);
            let sessionOwner = await Sessions.getTokenOwner(reqToken);

            let User = await Users.getUser(sessionOwner);

            return res.status(200).json({
                profile: {
                    id: User.id,
                    email: User.email,
                    picture_url: User.picture_url,
                    given_name: User.given_name,
                    family_name: User.family_name,
                    createdAt: User.createdAt
                }
            });
        }).catch(next);
    }
}

export default Me;
