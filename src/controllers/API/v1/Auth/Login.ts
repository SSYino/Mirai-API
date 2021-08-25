import Logger from '../../../../libs/Logger';

import RequestHelper from "../../../../libs/RequestHelper";
import Users from "../../../../services/Users";

class Login {
    public static perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
            if (typeof req.query != "undefined" && typeof req.query.code != "undefined") {
                const code = req.query.code;
                
                let result = await Users.authenticate(code)
                res.json(result);
            }
            
            else {
                return res.status(200).json({
                    success: true,
                    url: Users.generateAuthenticateURL()
                });
            }

        }).catch(next)
    }
}

export default Login;