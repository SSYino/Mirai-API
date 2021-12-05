import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import Sessions from "../../../../services/Sessions";
import Users from "../../../../services/Users";
import { ServiceError } from "../../../../exception/Errors";
import HTTP_STATUS from "../../../../libs/HTTPStatus";

class Profile {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
            //let reqToken = Sessions.extractTokenHeader(req);
            ///let sessionOwner = await Sessions.getTokenOwner(reqToken);

            if(!Users.isGoogleIdValid(req.params.id))
                throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "Invalid GoogleID");

            let User = await Users.getUser(req.params.id);

            return res.status(200).json({
                profile: {
                    id: User.id,
                    //email: User.email,
                    picture_url: User.picture_url,
                    given_name: User.given_name,
                    family_name: User.family_name,
                    createdAt: User.createdAt
                }
            });
        }).catch(next);
    }
}

export default Profile;
