import Logger from '../../../../libs/Logger';

import RequestHelper from "../../../../libs/RequestHelper";
import Users from "../../../../services/Users";

class Login {
    public static async perform(req: any, res: any) {

        if (typeof req.query != "undefined" && typeof req.query.code != "undefined") {
            const code = req.query.code;
            res.json(await Users.authenticate(code));
        }

        else {
            return res.status(200).json({
                success: true,
                url: Users.generateAuthenticateURL()
            });
        }

    }
}

export default Login;
