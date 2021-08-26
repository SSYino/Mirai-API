import Environment from "../providers/Environment";

import Prisma from "../providers/Prisma";
import Crypto from "crypto";
import Validator from "validator";

import { DatabaseError, ServiceError } from "../exception/Errors"
import Users from "./Users";
import HTTP_STATUS from "../libs/HTTPStatus";

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
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "No headers was sent");
        
        if(typeof req.headers.authorization == 'undefined')
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "Authorization header is required");

        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') 
            return req.headers.authorization.split(' ')[1];

        else if (req.query && req.query.token)
            return req.query.token;

        throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "No token was sent");
    }

    public static async issueToken(id: any, access_token: any, refresh_token: any, expiry_date: any) {

        const User = await Users.getUser(id);
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
                userId: User.id
            },
        });

        if (result == null)
            throw new DatabaseError("Unable to save new token, create object is null");

        return token;
    }

    public static async validateToken(token: string) {

        if(typeof token == 'undefined')
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "No token provided");
        
        if(!Validator.isAlphanumeric(token))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, "Token must be alphanumeric");

        const encryptedToken = this.encryptToken(token);
        const result = await Prisma.client.sessions.findUnique({
            where: {
                token: encryptedToken
            }
        });

        if (result == null)
            throw new ServiceError(HTTP_STATUS.UNAUTHORIZED, "Invalid token");

        if(result.revoked) {
            throw new ServiceError(HTTP_STATUS.UNAUTHORIZED, "Token was revoked")
        }

        /*if(new Date(result.expireAt) < new Date()) {
            return {
                valid: false,
                revoked: false,
                error: "Token expired"
            }
        }*/

        return true;

    }

    public static async getGoogleToken(token: string) {

        await this.validateToken(token);

        const tokenQuery = await Prisma.client.sessions.findUnique({
            where: {
                token: this.encryptToken(token)
            }
        });

        if(tokenQuery == null)
            throw new DatabaseError("Unable to get token owner, token object is null")

        return {
            access_token: tokenQuery.access_token,
            refresh_token: tokenQuery.refresh_token,
            expiry_date_token: tokenQuery.expiry_date_token,
            owner: tokenQuery.userId
        };

    }

    public static async getTokenOwner(token: string) {

        await this.validateToken(token);
        
        const tokenQuery = await Prisma.client.sessions.findUnique({
            where: {
                token: this.encryptToken(token)
            }
        });

        if(tokenQuery == null)
            throw new DatabaseError("Unable to get token owner, token object is null")

        return tokenQuery.userId;

    }

}

export default Sessions;
