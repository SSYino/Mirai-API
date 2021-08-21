import Environment from "../providers/Environment";

import Prisma from "../providers/Prisma";
import Crypto from "crypto";
import Validator from "validator";

import Users from "./Users";

class Sessions {
    constructor() {}

    private static makeRandomToken() {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

        let result = "";
        let length = parseInt(Environment.get().SESSION_TOKEN_LENGTH);

        for (let i = length; i > 0; --i)
            result += chars[Math.floor(Math.random() * chars.length)];

        return result;
    }

    private static encryptToken(token: string) {
       return Crypto.createHmac("sha256", Environment.get().SESSION_TOKEN_SHA256_KEY).update(token).digest("hex");
    }

    public static extractTokenHeader (req: any) {

        if(typeof req.headers == 'undefined')
            return {
                success: false,
                error: 'No headers was sent'
            };
        
        if(typeof req.headers.authorization == 'undefined')
            return {
                success: false,
                error: 'Authorization header is required'
            };

        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') 
            return {
                success: true,
                token: req.headers.authorization.split(' ')[1]
            };
        else if (req.query && req.query.token)
            return {
                success: true,
                token: req.query.token
            };

        return {
            success: false,
            error: 'No token was sent'
        };
    }

    public static async issueToken(id: any, access_token: any, refresh_token: any, expiry_date: any) {
        const User = await Users.getUser(id);

        if(!User.success)
            return {
                success: false,
                error: User.error
            }

        
        if(typeof User.data === "undefined")
            throw new Error("Unable to issue new token, user object is null");

        const token = this.makeRandomToken();

        const encryptedToken = this.encryptToken(token);

        //let expireDate = new Date();
        //expireDate.setSeconds(expireDate.getSeconds() + parseInt(Environment.get().SESSION_TOKEN_VALID_LENGTH));

        const result = await Prisma.client.sessions.create({
            data: {
                token: encryptedToken,
                access_token: access_token,
                refresh_token: refresh_token,
                expiry_date_token: new Date(expiry_date),
                userId: User.data.id
            },
        });

        if (result == null)
            throw new Error("Unable to save new token, create object is null");

        return {
            success: true,
            token: token
        };
    }

    public static async validateToken(token: string) {

        if(typeof token == 'undefined')
            return {
                valid: false,
                error: "No token provided"
            }
        
        if(!Validator.isAlphanumeric(token))
            return {
                valid: false,
                error: "Token must be alphanumeric"
            }

        
        const encryptedToken = this.encryptToken(token);
        const result = await Prisma.client.sessions.findUnique({
            where: {
                token: encryptedToken
            }
        });

        if (result == null) {
            return {
                valid: false,
                error: "Invalid token"
            }
        }

        if(result.revoked) {
            return {
                valid: false,
                revoked: true,
                error: "Token was revoked"
            }
        }

        /*if(new Date(result.expireAt) < new Date()) {
            return {
                valid: false,
                revoked: false,
                error: "Token expired"
            }
        }*/

        return {
            valid: true
        }

    }

    public static async getGoogleToken(token: string) {
        let tokenCheck = await this.validateToken(token);

        if(!tokenCheck.valid || tokenCheck.revoked || typeof tokenCheck.error !== "undefined")
        return {
            success: false,
            error: tokenCheck.error
        }

        const tokenQuery = await Prisma.client.sessions.findUnique({
            where: {
                token: this.encryptToken(token)
            }
        });

        if(tokenQuery == null)
            throw new Error("Unable to get token owner, token object is null")

        return {
            success: true,
            access_token: tokenQuery.access_token,
            refresh_token: tokenQuery.refresh_token,
            expiry_date_token: tokenQuery.expiry_date_token,
            owner: tokenQuery.userId
        };

    }

    public static async getTokenOwner(token: string) {

        let tokenCheck = await this.validateToken(token);
        
        if(!tokenCheck.valid || tokenCheck.revoked || typeof tokenCheck.error !== "undefined")
            return {
                success: false,
                error: tokenCheck.error
            }

        const tokenQuery = await Prisma.client.sessions.findUnique({
            where: {
                token: this.encryptToken(token)
            }
        });

        if(tokenQuery == null)
            throw new Error("Unable to get token owner, token object is null")

        return {
            success: true,
            id: tokenQuery.userId
        };

    }

}

export default Sessions;
