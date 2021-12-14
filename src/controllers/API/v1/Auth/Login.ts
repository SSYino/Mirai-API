import Logger from '../../../../libs/Logger';

import RequestHelper from "../../../../libs/RequestHelper";
import Users from "../../../../services/Users";

import { ServiceError, DatabaseError } from "../../../../exception/Errors"

class Login {
    public static perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {
            if (typeof req.query != "undefined" && typeof req.query.code != "undefined") {
                const code = req.query.code;
                
                let result = await Users.authenticate(code)
                res.json(result);
            }
            
            else {

                // TODO: Make this better
                let isError = false;
                try {
                    await Users.getUser("0")
                } catch (err) {
                    if(!(err instanceof ServiceError)) {
                        isError = true;
                    }
                }

                if(!isError)
                    return res.status(200).json({
                        redirect_url: Users.generateAuthenticateURL()
                    });
                else
                    res.status(500).json({
                        error: "The API is currently unavailable for service right now, try again later"
                    });
            }

        }).catch(next);
    }
}

export default Login;