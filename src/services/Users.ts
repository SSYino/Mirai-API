import Environment from '../providers/Environment';
import GoogleAPI from "../providers/GoogleAPI";
import Prisma from "../providers/Prisma";

import { ServiceError, DatabaseError } from "../exception/Errors"

import Validator from "validator";
import Sessions from './Sessions';
import Logger from '../libs/Logger';
import HTTP_STATUS from '../libs/HTTPStatus';

const WHITELIST = [

];

class Users {

    constructor() {

    }

    public static generateAuthenticateURL() {

        const credentials = GoogleAPI.getConfig();

        const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
            credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: GoogleAPI.scopes,
        });

        return authUrl;

    }

    public static async createUser(id: string, email: string, given_name: string, family_name: string, picture_url: string) {

        if(!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        let doesExist = await Users.exists(id);

        if (doesExist)
            throw new ServiceError(HTTP_STATUS.CONFLICT, 'Google ID already exists');

        const result = await Prisma.client.users.create({
            data: {
                id: id,
                given_name: given_name,
                family_name: family_name,
                email: email,
                picture_url: picture_url,
            },
        });

        if (result == null)
            throw new DatabaseError("User creation failed, result is null");

        return true;
    }

    public static async authenticate(code: string) {
        const credentials = GoogleAPI.getConfig();

        const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
            credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        let token, profile;

        try {
            token = await oAuth2Client.getToken(code);
        } catch (err: any) {
            if(err?.response?.data?.error === "invalid_grant")
                throw new ServiceError(HTTP_STATUS.UNAUTHORIZED, "Invalid Google OAuth2 grant");
            else
                throw err;
        }

        await oAuth2Client.setCredentials(token.tokens);

        const oauth2 = GoogleAPI.google.oauth2({
            auth: oAuth2Client,
            version: 'v2'
        });

        profile = await oauth2.userinfo.get();

        if(!this.isWhitelisted(profile.data.id))
            throw new ServiceError(HTTP_STATUS.FORBIDDEN, `GoogleID not whitelisted, If you wish to access the application, please contact the developer and give them your user id (${profile.data.id})`);        
        
        let doesExist = await Users.exists(profile.data.id);        
        let gmail = await GoogleAPI.google.gmail('v1').users.getProfile({
            userId: profile.data.id,
            auth: oAuth2Client,
        });


        if (!doesExist) {
            await Users.createUser(profile.data.id, gmail.data.emailAddress, profile.data.given_name, profile.data.family_name, profile.data.picture);
        } else {
            // TODO: Check if user data was changed and update it on the database.
        }

        const issuedToken = await Sessions.issueToken(profile.data.id, token.tokens.access_token, token.tokens.refresh_token, token.tokens.expiry_date);
            
        return {
            token: issuedToken,
            profile: {
                family_name: profile.data.family_name,
                given_name: profile.data.given_name,
                id: profile.data.id,
                locale: profile.data.locale,
                name: profile.data.name,
                picture: profile.data.picture,
                emailAddress: gmail.data.emailAddress
            }
        }
    }

    public static async getUser(id: string) {
        if(!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        const result = await Prisma.client.users.findUnique({
            where: {
                id: id
            },
        });

        if (result == null)
            throw new ServiceError(HTTP_STATUS.NOT_FOUND, 'User does not exist');

        return result;
    }

    public static async getAllUser() {
        const result = await Prisma.client.users.findMany();
        return result;
    }

    public static async exists(id: string) {

        if(!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        const result = await Prisma.client.users.findUnique({
            where: {
                id: id
            },
        });
    
        if (result == null)
            return false;
        
        return true;

    }

    public static isGoogleIdValid(id: string) {
        if (!Validator.isNumeric(id))
            return false;

        return true;
    }

    public static isWhitelisted(id: string) {
        return true;
        //return WHITELIST.includes(id)
    }

    public static async isAdmin(id: string) {

        if(!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        let user = await this.getUser(id);

        return user.isAdmin;
    }
    
}

export default Users;
